import os
import requests
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


def detect_intent(message: str) -> str:
    text = message.lower()

    if any(keyword in text for keyword in ["tree plantation", "plantation drive", "sapling", "afforestation"]):
        return "tree_plantation"
    if any(keyword in text for keyword in ["cleanliness", "clean campaign", "swachh", "sanitation", "cleanup"]):
        return "cleanliness_campaign"
    if any(keyword in text for keyword in ["ngo", "nonprofit", "non-profit", "partner", "partners"]):
        return "ngo_partners"
    if any(keyword in text for keyword in ["csr", "corporate social responsibility", "sponsor", "company"]):
        return "csr_companies"
    if any(keyword in text for keyword in ["email", "write an email", "draft an email"]):
        return "professional_email"
    if any(keyword in text for keyword in ["meeting summary", "meeting notes", "minutes", "action items"]):
        return "meeting_summary"
    if any(keyword in text for keyword in ["project report", "report", "progress report"]):
        return "project_report"
    if any(keyword in text for keyword in ["sdg 17", "partnerships for the goals", "explain sdg 17"]):
        return "sdg17_explanation"
    if any(keyword in text for keyword in ["sustainability", "sustainable", "environment", "green", "impact"]):
        return "sustainability"
    return "general"


def build_prompt(message: str) -> str:
    intent = detect_intent(message)
    intent_label = intent.replace("_", " ").title()

    if intent == "tree_plantation":
        return f"""You are an expert sustainability program planner for SDG 17.
Create a practical plan for a tree plantation drive based on the user's request.
User intent: {intent_label}
User request: {message}
Include the objective, target audience, location, timeline, volunteer roles, sapling types, budget estimate, safety steps, and success metrics.
"""

    if intent == "cleanliness_campaign":
        return f"""You are an expert community project coordinator for SDG 17.
Create a practical cleanliness campaign plan based on the user's request.
User intent: {intent_label}
User request: {message}
Include campaign goal, outreach approach, supplies, volunteer roles, timeline, stakeholder partners, waste management plan, and impact measurement.
"""

    if intent == "ngo_partners":
        return f"""You are an experienced social impact advisor.
Suggest strong NGO partner options and explain why each would be a fit for the user's request.
User intent: {intent_label}
User request: {message}
Provide 4-6 realistic NGO types or examples, their strengths, and a short partnership approach.
"""

    if intent == "csr_companies":
        return f"""You are an expert partnership strategist.
Suggest CSR-aligned companies or corporate partners that could support the user's request.
User intent: {intent_label}
User request: {message}
Provide 4-6 names or categories of companies, the reason they fit, and a simple collaboration idea.
"""

    if intent == "professional_email":
        return f"""You are a professional communications assistant.
Write a polished professional email based on the user's request.
User intent: {intent_label}
User request: {message}
Include a subject line, greeting, body, and closing sentence.
"""

    if intent == "meeting_summary":
        return f"""You are a business communication assistant.
Create a concise and professional meeting summary based on the user's request.
User intent: {intent_label}
User request: {message}
Include key discussion points, decisions made, action items, owners, and deadlines.
"""

    if intent == "project_report":
        return f"""You are a project reporting assistant.
Generate a clear project report based on the user's request.
User intent: {intent_label}
User request: {message}
Include project overview, objectives, activities, outcomes, challenges, partnerships, and next steps.
"""

    if intent == "sdg17_explanation":
        return f"""You are an SDG educator.
Explain SDG 17 clearly and simply based on the user's request.
User intent: {intent_label}
User request: {message}
Explain what SDG 17 means, why it matters, and how partnerships can help achieve it.
"""

    if intent == "sustainability":
        return f"""You are a sustainability advisor.
Answer the user's sustainability question clearly and practically.
User intent: {intent_label}
User request: {message}
Give a concise, actionable explanation with examples where useful.
"""

    return f"""You are a helpful AI assistant for SDG 17 and sustainability.
Respond to the user's request in a professional, concise, and actionable way.
User request: {message}
"""


def build_task_prompt(task: str, topic: str) -> str:
    if task == "planner":
        return f"""You are a sustainability event planning assistant. Create a practical plan for the following request.\nRequest: {topic}\nInclude objective, audience, venue, timeline, volunteer roles, budget, and success measures."""
    if task == "email":
        return f"""You are a professional communications assistant. Draft a polished email for the following request.\nRequest: {topic}\nInclude a subject line, greeting, body, and closing line."""
    if task == "report":
        return f"""You are a project reporting assistant. Write a concise, professional project report for the following request.\nRequest: {topic}\nInclude overview, activities, outcomes, partnerships, challenges, and next steps."""
    if task == "partners":
        return f"""You are a social impact advisor. Recommend realistic partner organizations or institutions for the following request.\nRequest: {topic}\nReturn 4 concise partner recommendations with reasons and a simple collaboration idea."""
    return f"""You are a helpful sustainability assistant. Respond to the following request clearly and practically.\nRequest: {topic}"""


def fallback_task_response(task: str, topic: str) -> str:
    if task == "planner":
        return (
            f"Here is a practical plan for {topic}: define the goal, gather a volunteer team, secure a venue, coordinate logistics, assign outreach and follow-up tasks, and track participation and impact after the event."
        )
    if task == "email":
        return (
            f"Subject: Partnership Request for {topic}\n\nHello,\nI hope you are well. I am reaching out to discuss a collaborative initiative around {topic}. I would appreciate the opportunity to explore how we can work together and create measurable community impact.\n\nBest regards,\nPartnership Team"
        )
    if task == "report":
        return (
            f"Project Report: {topic}\n\nOverview: The initiative was designed to support measurable impact through partnership-based action. Activities: outreach, planning, implementation, and follow-up. Outcomes: strong community participation, visible results, and clear next steps for scaling the effort."
        )
    if task == "partners":
        return (
            "Recommended partners: local environmental NGOs, youth development organizations, CSR-focused companies, and community-based education groups. Each partner can contribute visibility, mobilization, or implementation support."
        )
    return topic


def generate_task_response(task: str, topic: str) -> str:
    prompt = build_task_prompt(task, topic)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()

    if api_key and api_key != "your_api_key_here":
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.7, "topP": 0.9},
            }
            response = requests.post(url, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            if data.get("candidates"):
                text = data["candidates"][0]["content"]["parts"][0].get("text", "")
                if text.strip():
                    return text.strip()
        except Exception:
            pass

    return fallback_task_response(task, topic)


def generate_partner_recommendations(topic: str):
    base_matches = [
        {"name": "Green Future Foundation", "focus": "Community engagement", "reason": "Strong local mobilization and sustainability training."},
        {"name": "Bright Horizons Network", "focus": "Youth empowerment", "reason": "Excellent for school and student-led impact programs."},
        {"name": "EcoBridge Alliance", "focus": "Environmental restoration", "reason": "Ideal for planting and cleanup initiatives."},
        {"name": "Community Impact Lab", "focus": "CSR collaboration", "reason": "Great for designing measurable partnerships and reporting."},
    ]

    if "school" in topic.lower():
        base_matches[1]["reason"] = "Strong fit for school partnerships and youth leadership engagement."
    if "cleanup" in topic.lower() or "cleanliness" in topic.lower():
        base_matches[2]["reason"] = "Excellent fit for cleanup drives and visible community service efforts."
    if "email" in topic.lower() or "outreach" in topic.lower():
        base_matches[3]["reason"] = "Very strong for outreach planning and communications support."

    return base_matches


def get_dashboard_data():
    return {
        "stats": [
            {"label": "Events Created", "value": 48},
            {"label": "Partners Connected", "value": 126},
            {"label": "Reports Generated", "value": 89},
            {"label": "Volunteers", "value": 320},
        ],
        "upcoming_events": [
            {"title": "Community Clean-Up", "time": "Fri • 9:00 AM"},
            {"title": "Tree Plantation Drive", "time": "Sun • 7:30 AM"},
            {"title": "CSR Roundtable", "time": "Tue • 3:00 PM"},
        ],
        "ngo_suggestions": generate_partner_recommendations("sustainability partnership"),
        "activity": [
            {"title": "Report shared", "time": "2 mins ago"},
            {"title": "Partner request accepted", "time": "18 mins ago"},
            {"title": "Email drafted", "time": "41 mins ago"},
        ],
        "sidebar": {
            "impact_score": 96,
            "insight": "Partner for positive change",
        },
    }


def fallback_response(message: str, intent: str) -> str:
    if intent == "tree_plantation":
        return (
            "Here is a strong tree plantation drive plan: set a clear objective such as planting 500 native trees, partner with a local school or community group, schedule the event for a weekend morning, assign volunteers to digging, watering, and monitoring, and track survival rates after 30 days."
        )
    if intent == "cleanliness_campaign":
        return (
            "Here is a practical cleanliness campaign plan: define the area to be cleaned, recruit volunteers, provide gloves and bins, coordinate waste segregation, share awareness messages before the event, and measure impact through the amount of waste collected and community participation."
        )
    if intent == "ngo_partners":
        return (
            "You can approach local environmental NGOs, youth development nonprofits, women empowerment groups, and health-focused community organizations. A good partnership approach is to align on shared outcomes, define roles, and create a simple co-branded awareness or service program."
        )
    if intent == "csr_companies":
        return (
            "Good CSR candidates often include consumer goods, telecom, banking, logistics, and manufacturing companies with sustainability or community development programs. A simple pitch is to offer a measurable community impact project with visibility and employee volunteer participation."
        )
    if intent == "professional_email":
        return (
            "Here is a professional email structure: subject, greeting, purpose, key details, requested action, and closing. You can adapt it for partnership requests, sponsor outreach, or event invitations."
        )
    if intent == "meeting_summary":
        return (
            "A strong meeting summary should include the purpose, key decisions, action items, responsible people, and deadlines. You can also add risks, dependencies, and next steps for clarity."
        )
    if intent == "project_report":
        return (
            "A strong project report should include an overview, objectives, implemented activities, measurable results, partnership details, challenges, and recommended next steps."
        )
    if intent == "sdg17_explanation":
        return (
            "SDG 17, Partnerships for the Goals, focuses on building strong collaborations between governments, businesses, civil society, and communities to achieve the Sustainable Development Goals. It matters because no single actor can solve global challenges alone."
        )
    if intent == "sustainability":
        return (
            "Sustainability means meeting today’s needs without compromising the ability of future generations to meet theirs. Practical steps include reducing waste, conserving energy, supporting local communities, and choosing long-term impact over short-term gains."
        )
    return (
        "I can help you plan partnerships, campaigns, emails, reports, or sustainability initiatives for SDG 17. Share your goal and I will structure a practical response."
    )


def generate_agent_response(message: str) -> str:
    return f"Hello! Your message was: {message}"