import os
from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from typing import Dict, List
import json

try:
    from .agent import (
        generate_agent_response,
        generate_partner_recommendations,
        generate_task_response,
        get_dashboard_data,
    )
    from .database import get_chat_history, init_db, save_chat_message
    from .models import ChatRequest, ChatResponse
except ImportError:  # pragma: no cover - allows running the module directly
    from agent import (
        generate_agent_response,
        generate_partner_recommendations,
        generate_task_response,
        get_dashboard_data,
    )
    from database import get_chat_history, init_db, save_chat_message
    from models import ChatRequest, ChatResponse

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

app = FastAPI(title="Partnership AI Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Partnership AI Agent"}


@app.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    try:
        reply = generate_agent_response(request.message)

        save_chat_message("user", request.message)
        save_chat_message("assistant", reply)

        return ChatResponse(
            reply=reply,
            status="ok"
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc)
        )
        

@app.get("/history")
def history(limit: int = 10):
    try:
        return {"history": get_chat_history(limit=max(1, min(limit, 100)))}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to load chat history.") from exc


@app.get("/dashboard")
def dashboard():
    try:
        return get_dashboard_data()
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to load dashboard data.") from exc


@app.post("/planner")
def planner(payload: dict = Body(...)):
    topic = str(payload.get("topic", "")).strip() or "a community sustainability event"
    try:
        return {"plan": generate_task_response("planner", topic), "topic": topic}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate planner output.") from exc


@app.post("/email")
def email_generator(payload: dict = Body(...)):
    topic = str(payload.get("topic", "")).strip() or "a partnership opportunity"
    try:
        return {"email": generate_task_response("email", topic), "topic": topic}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate email draft.") from exc


@app.post("/report")
def report_generator(payload: dict = Body(...)):
    topic = str(payload.get("topic", "")).strip() or "a sustainability initiative"
    try:
        return {"report": generate_task_response("report", topic), "topic": topic}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate report.") from exc


@app.post("/partners")
def partner_finder(payload: dict = Body(...)):
    topic = str(payload.get("topic", "")).strip() or "a sustainability partnership"
    try:
        return {"partners": generate_partner_recommendations(topic), "topic": topic}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to load partner suggestions.") from exc


@app.post("/search")
def search(payload: dict = Body(...)):
    query = str(payload.get("query", "")).strip() or "sustainability"
    try:
        results = [
            {
                "title": f"{query.title()} initiative",
                "category": "Program",
                "summary": f"A practical {query.lower()} plan tailored for community impact and partnership execution.",
            },
            {
                "title": f"{query.title()} outreach",
                "category": "Engagement",
                "summary": f"A focused outreach approach for {query.lower()} with local stakeholders and volunteers.",
            },
            {
                "title": f"{query.title()} impact review",
                "category": "Measurement",
                "summary": f"A concise review of outcomes, collaboration, and measurable impact for {query.lower()}.",
            },
        ]
        return {"query": query, "results": results}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to run search.") from exc


@app.get("/insights")
def insights():
    try:
        return {
            "summary": "SDG 17 partnerships accelerate measurable community impact through collaboration.",
            "highlights": [
                {"title": "Collaboration matters", "detail": "Shared goals increase reach and resilience for sustainability teams."},
                {"title": "Actionable outreach", "detail": "Clear communication turns ideas into funded, visible programs."},
                {"title": "Measurement drives trust", "detail": "Concrete outcomes strengthen future funding and partnership opportunities."},
            ],
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to load insights.") from exc


@app.get("/tasks")
def tasks():
    try:
        return {
            "tasks": [
                {"id": 1, "title": "Confirm volunteer lead", "status": "In progress"},
                {"id": 2, "title": "Draft partner outreach", "status": "Pending"},
                {"id": 3, "title": "Share report with stakeholders", "status": "Ready"},
            ]
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to load task manager data.") from exc


@app.get("/profile")
def profile():
    try:
        return {
            "name": "Maya",
            "role": "Program Lead",
            "region": "Seattle, WA",
            "focus": "Sustainability partnerships",
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to load profile data.") from exc


@app.post("/event-plan")
def event_plan(payload: dict = Body(...)):
    event_name = str(payload.get("event_name", "Community Event")).strip() or "Community Event"
    location = str(payload.get("location", "Local Community")).strip() or "Local Community"
    date = str(payload.get("date", "TBD")).strip() or "TBD"
    volunteers = int(payload.get("volunteers", 10) or 10)
    try:
        plan = {
            "event_name": event_name,
            "objectives": [
                f"Create a visible impact for {event_name}",
                f"Engage {volunteers} volunteers in a meaningful service activity",
                f"Build local partnerships around {location}",
            ],
            "budget": "$3,500 - $6,000",
            "materials": ["Signage", "Event kits", "Water stations", "Volunteer badges", "Safety gloves"],
            "timeline": [
                {"step": "Planning", "detail": "Confirm venue, permissions, and outreach plan 2 weeks before the event"},
                {"step": "Execution", "detail": f"Run the program in {location} on {date}"},
                {"step": "Follow-up", "detail": "Capture photos, feedback, and impact metrics after the event"},
            ],
            "volunteer_roles": [
                {"role": "Coordinator", "responsibility": "Oversee schedule and logistics"},
                {"role": "Outreach Lead", "responsibility": "Welcome participants and partners"},
                {"role": "Operations Support", "responsibility": "Manage supplies and setup"},
            ],
            "checklist": [
                "Confirm venue and permits",
                "Distribute volunteer assignments",
                "Prepare signage and materials",
                "Share event schedule",
                "Collect impact feedback",
            ],
        }
        return {"plan": plan}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate event plan.") from exc


@app.post("/partner-finder")
def partner_finder_extended(payload: dict = Body(...)):
    event_type = str(payload.get("event_type", "community impact")).strip() or "community impact"
    city = str(payload.get("city", "Local")).strip() or "Local"
    try:
        partners = [
            {
                "name": f"{city} Environmental Collective",
                "category": "Environmental NGO",
                "description": f"A strong fit for {event_type} initiatives needing volunteer mobilization and local visibility.",
                "contact": "partnerships@environmentalcollective.org",
            },
            {
                "name": f"{city} Youth Impact Network",
                "category": "Youth Development",
                "description": f"Ideal for school and youth-led {event_type} programs with community engagement.",
                "contact": "hello@youthimpactnetwork.org",
            },
            {
                "name": f"{city} Civic Sustainability Lab",
                "category": "CSR & Innovation",
                "description": f"Great for measurable {event_type} projects with reporting and impact measurement.",
                "contact": "contact@civicsustainabilitylab.org",
            },
        ]
        return {"partners": partners}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to find partners.") from exc


@app.post("/email-generator")
def email_generator(payload: dict = Body(...)):
    recipient = str(payload.get("recipient", "partner@example.org")).strip() or "partner@example.org"
    purpose = str(payload.get("purpose", "explore collaboration")).strip() or "explore collaboration"
    try:
        email = {
            "subject": f"Collaboration Opportunity for {purpose.title()}",
            "body": f"Hi {recipient.split('@')[0].replace('.', ' ').title()},\n\nI hope you are well. I am reaching out to explore a partnership around {purpose}. We believe this effort can create meaningful community impact and strengthen local engagement.\n\nPlease let me know if you would be available for a brief conversation this week.\n\nBest regards,\nPartnership AI Agent",
        }
        return {"email": email}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate email.") from exc


@app.post("/report-generator")
def report_generator(payload: dict = Body(...)):
    topic = str(payload.get("topic", "community sustainability")).strip() or "community sustainability"
    try:
        report = {
            "title": f"Project Report: {topic.title()}",
            "summary": f"This report summarizes the activities, outreach, and impact of the {topic} initiative.",
            "sections": [
                {"heading": "Overview", "content": "The initiative focused on building local engagement, aligning stakeholders, and delivering visible outcomes using a structured plan."},
                {"heading": "Activities", "content": "Volunteer coordination, outreach, implementation support, and stakeholder follow-up were completed across the project timeline."},
                {"heading": "Outcomes", "content": "Community participation improved, partnerships strengthened, and the program created measurable value for the target audience."},
                {"heading": "Next Steps", "content": "Expand participation, deepen partner engagement, and formalize recurring impact tracking for future cycles."},
            ],
        }
        return {"report": report}
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate report.") from exc


@app.post("/sdg-insights")
def sdg_insights(payload: dict = Body(...)):
    topic = str(payload.get("topic", "SDG 17")).strip() or "SDG 17"
    try:
        insights = {
            "summary": f"{topic} highlights the value of cross-sector collaboration for long-term sustainability and measurable community impact.",
            "points": [
                "Partnerships strengthen implementation and reduce duplication of effort.",
                "Shared goals increase trust and improve resource mobilization.",
                "Strong collaboration leads to more durable local impact.",
            ],
        }
        return insights
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Unable to generate SDG insights.") from exc
