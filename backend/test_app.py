import os
import sys

from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.app import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json()['status'] == 'ok'


def test_search_endpoint():
    response = client.post('/search', json={'query': 'tree plantation'})
    assert response.status_code == 200
    data = response.json()
    assert data['query'] == 'tree plantation'
    assert len(data['results']) >= 1


def test_insights_endpoint():
    response = client.get('/insights')
    assert response.status_code == 200
    data = response.json()
    assert 'summary' in data
    assert len(data['highlights']) >= 1


def test_tasks_endpoint():
    response = client.get('/tasks')
    assert response.status_code == 200
    data = response.json()
    assert 'tasks' in data
    assert len(data['tasks']) >= 1


def test_profile_endpoint():
    response = client.get('/profile')
    assert response.status_code == 200
    data = response.json()
    assert data['name'] == 'Maya'
    assert 'role' in data


def test_event_plan_endpoint():
    response = client.post('/event-plan', json={
        'event_name': 'Community Orchard Day',
        'location': 'Seattle',
        'date': '2026-09-05',
        'volunteers': 20,
    })
    assert response.status_code == 200
    data = response.json()
    assert 'plan' in data
    assert 'objectives' in data['plan']


def test_partner_finder_endpoint():
    response = client.post('/partner-finder', json={
        'event_type': 'tree planting',
        'city': 'Seattle',
    })
    assert response.status_code == 200
    data = response.json()
    assert len(data['partners']) >= 1


def test_email_generator_endpoint():
    response = client.post('/email-generator', json={
        'recipient': 'maria@ngo.org',
        'purpose': 'request partnership',
    })
    assert response.status_code == 200
    data = response.json()
    assert 'subject' in data['email']


def test_report_generator_endpoint():
    response = client.post('/report-generator', json={'topic': 'community sustainability'})
    assert response.status_code == 200
    data = response.json()
    assert 'report' in data


def test_sdg_insights_endpoint():
    response = client.post('/sdg-insights', json={'topic': 'SDG 17'})
    assert response.status_code == 200
    data = response.json()
    assert 'summary' in data
