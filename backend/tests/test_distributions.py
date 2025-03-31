import pytest
from decimal import Decimal
from fastapi import status


@pytest.fixture
def token_id(client):
    """Create a test token and return its ID."""
    token_data = {
        "token_name": "Test Token",
        "token_symbol": "TEST",
        "decimals": 18,
        "total_supply": "1000000",
        "creator_wallet": "0x1234567890123456789012345678901234567890"
    }
    
    response = client.post("/api/v1/tokens/", json=token_data)
    return response.json()["id"]


def test_create_distribution(client, token_id):
    """Test creating a new token distribution."""
    distribution_data = {
        "token_config_id": token_id,
        "recipient_address": "0x9876543210987654321098765432109876543210",
        "chain_id": "1",
        "token_amount": "1000"
    }
    
    response = client.post("/api/v1/distributions/", json=distribution_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["token_config_id"] == token_id
    assert data["recipient_address"] == distribution_data["recipient_address"]
    assert data["chain_id"] == distribution_data["chain_id"]
    assert data["token_amount"] == distribution_data["token_amount"]
    assert data["status"] == "pending"
    assert "id" in data
    assert "created_at" in data


def test_create_distribution_invalid_token(client):
    """Test creating a distribution with invalid token ID."""
    distribution_data = {
        "token_config_id": 999,  # Non-existent token ID
        "recipient_address": "0x9876543210987654321098765432109876543210",
        "chain_id": "1",
        "token_amount": "1000"
    }
    
    response = client.post("/api/v1/distributions/", json=distribution_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_get_distribution(client, token_id):
    """Test getting a distribution by ID."""
    # First create a distribution
    distribution_data = {
        "token_config_id": token_id,
        "recipient_address": "0x9876543210987654321098765432109876543210",
        "chain_id": "1",
        "token_amount": "1000"
    }
    
    create_response = client.post("/api/v1/distributions/", json=distribution_data)
    distribution_id = create_response.json()["id"]
    
    # Then get the distribution
    response = client.get(f"/api/v1/distributions/{distribution_id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["id"] == distribution_id
    assert data["recipient_address"] == distribution_data["recipient_address"]


def test_get_distribution_not_found(client):
    """Test getting a non-existent distribution."""
    response = client.get("/api/v1/distributions/999")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_list_distributions_by_token(client, token_id):
    """Test listing distributions for a specific token."""
    # Create multiple distributions
    distribution_data = {
        "token_config_id": token_id,
        "recipient_address": "0x9876543210987654321098765432109876543210",
        "chain_id": "1",
        "token_amount": "1000"
    }
    
    for i in range(3):
        client.post("/api/v1/distributions/", json={
            **distribution_data,
            "recipient_address": f"0x{i}876543210987654321098765432109876543210"
        })
    
    # Test listing with pagination
    response = client.get(f"/api/v1/distributions/by-token/{token_id}?skip=0&limit=2")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2


def test_update_distribution(client, token_id):
    """Test updating a distribution."""
    # First create a distribution
    distribution_data = {
        "token_config_id": token_id,
        "recipient_address": "0x9876543210987654321098765432109876543210",
        "chain_id": "1",
        "token_amount": "1000"
    }
    
    create_response = client.post("/api/v1/distributions/", json=distribution_data)
    distribution_id = create_response.json()["id"]
    
    # Update the distribution
    update_data = {
        "status": "completed",
        "transaction_hash": "0xabc123"
    }
    
    response = client.patch(f"/api/v1/distributions/{distribution_id}", json=update_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["status"] == update_data["status"]
    assert data["transaction_hash"] == update_data["transaction_hash"] 