from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ...storage.in_memory import store
from ...services.peer_engineering_service import get_peer_service

router = APIRouter(prefix="/peer-engineering", tags=["peer-engineering"])


class CreateSessionRequest(BaseModel):
    application_id: str
    request_text: str
    tenant_id: str = "tenant_forgeiq"


class ApproveRequest(BaseModel):
    decided_by: str = "Developer"
    reason: str = ""


class RejectRequest(BaseModel):
    decided_by: str = "Developer"
    reason: str = ""


class RevisionRequest(BaseModel):
    feedback: str


class UpdateFileRequest(BaseModel):
    file_path: str
    content: str


class SelectFileRequest(BaseModel):
    file_path: str


@router.get("/sessions")
def list_sessions(application_id: str | None = None):
    return get_peer_service().list_sessions(application_id)


@router.get("/sessions/{session_id}")
def get_session(session_id: str):
    session = get_peer_service().get_session(session_id)
    if not session:
        raise HTTPException(404, "Peer engineering session not found")
    return session


@router.post("/sessions")
def create_session(body: CreateSessionRequest):
    try:
        return get_peer_service().create_session(body.application_id, body.request_text, body.tenant_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/sessions/{session_id}/approve")
def approve_session(session_id: str, body: ApproveRequest):
    try:
        return get_peer_service().approve_session(session_id, body.decided_by, body.reason)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/sessions/{session_id}/reject")
def reject_session(session_id: str, body: RejectRequest):
    try:
        return get_peer_service().reject_session(session_id, body.decided_by, body.reason)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/sessions/{session_id}/revision")
def request_revision(session_id: str, body: RevisionRequest):
    try:
        return get_peer_service().request_revision(session_id, body.feedback)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.put("/sessions/{session_id}/file")
def update_file(session_id: str, body: UpdateFileRequest):
    try:
        return get_peer_service().update_file_content(session_id, body.file_path, body.content)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/sessions/{session_id}/select-file")
def select_file(session_id: str, body: SelectFileRequest):
    try:
        return get_peer_service().select_file(session_id, body.file_path)
    except ValueError as e:
        raise HTTPException(400, str(e))
