import json
import logging
from typing import AsyncGenerator, Dict, Any, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langgraph.types import Command
from langgraph.errors import GraphInterrupt
from app.agent.state import AgentState
from app.agent.nodes import (
    planner_node,
    tool_selector_node,
    human_approval_gate,
    executor_node,
    validator_node,
    synthesizer_node
)

logger = logging.getLogger(__name__)

def route_from_tool_selector(state: AgentState) -> str:
    if state.get("is_complete"):
        return "synthesizer_node"
    if state.get("pending_approval"):
        return "human_approval_gate"
    return "executor_node"

def route_from_validator(state: AgentState) -> str:
    if state.get("is_complete"):
        return "synthesizer_node"
    return "tool_selector_node"

def build_agent_graph():
    builder = StateGraph(AgentState)

    # Register Nodes
    builder.add_node("planner_node", planner_node)
    builder.add_node("tool_selector_node", tool_selector_node)
    builder.add_node("human_approval_gate", human_approval_gate)
    builder.add_node("executor_node", executor_node)
    builder.add_node("validator_node", validator_node)
    builder.add_node("synthesizer_node", synthesizer_node)

    # Define Edges
    builder.add_edge(START, "planner_node")
    builder.add_edge("planner_node", "tool_selector_node")

    builder.add_conditional_edges(
        "tool_selector_node",
        route_from_tool_selector,
        {
            "human_approval_gate": "human_approval_gate",
            "executor_node": "executor_node",
            "synthesizer_node": "synthesizer_node"
        }
    )

    builder.add_edge("human_approval_gate", "executor_node")
    builder.add_edge("executor_node", "validator_node")

    builder.add_conditional_edges(
        "validator_node",
        route_from_validator,
        {
            "tool_selector_node": "tool_selector_node",
            "synthesizer_node": "synthesizer_node"
        }
    )

    builder.add_edge("synthesizer_node", END)

    # In-memory checkpointer for session state preservation and human approval resumption
    checkpointer = MemorySaver()
    return builder.compile(checkpointer=checkpointer)

agent_graph = build_agent_graph()

class AgentRunner:
    def __init__(self):
        self.graph = agent_graph

    async def stream_operation(
        self,
        session_id: str,
        user_request: str,
        user_role: str = "EMPLOYEE",
        actor_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Streams graph execution steps, plans, tool executions, and approval gate interrupts with RBAC governance.
        """
        config = {"configurable": {"thread_id": session_id}}
        effective_actor = actor_id or f"emp-7492 ({user_role.capitalize()})"
        initial_state = {
            "session_id": session_id,
            "user_request": user_request,
            "user_role": user_role,
            "actor_id": effective_actor,
            "messages": [{"role": "user", "content": user_request}],
            "plan": [],
            "current_step_index": 0,
            "observations": {},
            "pending_approval": None,
            "human_decision": None,
            "is_complete": False,
            "final_response": "",
            "error": None
        }

        try:
            # Stream events as nodes execute
            async for event in self.graph.astream(initial_state, config=config, stream_mode="updates"):
                for node_name, node_update in event.items():
                    if node_name == "planner_node":
                        yield {
                            "type": "plan_created",
                            "plan": node_update.get("plan", [])
                        }
                    elif node_name == "tool_selector_node":
                        # If pending approval is set, an interrupt will follow
                        if node_update.get("pending_approval"):
                            yield {
                                "type": "approval_required",
                                "approval": node_update.get("pending_approval")
                            }
                    elif node_name == "__interrupt__":
                        interrupts = node_update
                        if interrupts and len(interrupts) > 0:
                            inter_val = interrupts[0].value if hasattr(interrupts[0], "value") else interrupts[0]
                            yield {
                                "type": "approval_required",
                                "approval": inter_val
                            }
                    elif node_name == "executor_node":
                        yield {
                            "type": "step_executed",
                            "plan": node_update.get("plan", []),
                            "observations": node_update.get("observations", {})
                        }
                    elif node_name == "synthesizer_node":
                        final_resp = node_update.get("final_response", "")
                        yield {
                            "type": "final_response",
                            "content": final_resp
                        }

        except GraphInterrupt:
            # Clean pause at human approval gate
            state = await self.graph.aget_state(config)
            if state.tasks:
                for task in state.tasks:
                    if task.interrupts:
                        for inter in task.interrupts:
                            yield {
                                "type": "approval_required",
                                "approval": inter.value
                            }
        except Exception as e:
            logger.exception("Error during graph execution")
            yield {
                "type": "error",
                "error": str(e)
            }

    async def resume_with_decision(
        self,
        session_id: str,
        decision: str,  # "approved" or "rejected"
        approver_role: str = "MANAGER",
        approver_id: Optional[str] = None
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Resumes the paused graph from its checkpointer using human supervisor decision and verified approver role.
        """
        config = {"configurable": {"thread_id": session_id}}
        effective_approver = approver_id or f"mgr-0182 ({approver_role.capitalize()})"
        resume_command = Command(resume={
            "action": decision,
            "approver_role": approver_role,
            "approver_id": effective_approver
        })


        try:
            async for event in self.graph.astream(resume_command, config=config, stream_mode="updates"):
                for node_name, node_update in event.items():
                    if node_name == "__interrupt__":
                        interrupts = node_update
                        if interrupts and len(interrupts) > 0:
                            inter_val = interrupts[0].value if hasattr(interrupts[0], "value") else interrupts[0]
                            yield {
                                "type": "approval_required",
                                "approval": inter_val
                            }
                    elif node_name == "executor_node":
                        yield {
                            "type": "step_executed",
                            "plan": node_update.get("plan", []),
                            "observations": node_update.get("observations", {})
                        }
                    elif node_name == "synthesizer_node":
                        final_resp = node_update.get("final_response", "")
                        yield {
                            "type": "final_response",
                            "content": final_resp
                        }

        except GraphInterrupt:
            # Another interrupt occurred
            state = await self.graph.aget_state(config)
            if state.tasks:
                for task in state.tasks:
                    if task.interrupts:
                        for inter in task.interrupts:
                            yield {
                                "type": "approval_required",
                                "approval": inter.value
                            }
        except Exception as e:
            logger.exception("Error resuming graph")
            yield {
                "type": "error",
                "error": str(e)
            }

agent_runner = AgentRunner()
