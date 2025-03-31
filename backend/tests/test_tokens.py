import pytest
from decimal import Decimal
from fastapi import status


def test_create_token(client):
    """Test creating a new token configuration."""
    token_data = {
        "token_name": "Test Token",
        "token_symbol": "TEST",
        "decimals": 18,
        "total_supply": "1000000",
        "creator_wallet": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63",
        "icon_url": "https://example.com/icon.png"
    }
    
    response = client.post("/api/v1/tokens/", json=token_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["token_name"] == token_data["token_name"]
    assert data["token_symbol"] == token_data["token_symbol"]
    assert data["decimals"] == token_data["decimals"]
    assert data["total_supply"] == token_data["total_supply"]
    assert data["creator_wallet"] == token_data["creator_wallet"]
    assert data["icon_url"] == token_data["icon_url"]
    assert data["deployment_status"] == "pending"
    assert "id" in data
    assert "created_at" in data


def test_create_token_invalid_data(client):
    """Test creating a token with invalid data."""
    invalid_data = {
        "token_name": "Test Token",
        "token_symbol": "TEST",
        "decimals": 19,  # Invalid: decimals > 18
        "total_supply": "-1000",  # Invalid: negative supply
        "creator_wallet": "0x123"  # Invalid: incomplete wallet address
    }
    
    response = client.post("/api/v1/tokens/", json=invalid_data)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_get_token(client):
    """Test getting a token configuration by ID."""
    # First create a token
    token_data = {
        "token_name": "Test Token",
        "token_symbol": "TEST",
        "decimals": 18,
        "total_supply": "1000000",
        "creator_wallet": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
    }
    
    create_response = client.post("/api/v1/tokens/", json=token_data)
    token_id = create_response.json()["id"]
    
    # Then get the token
    response = client.get(f"/api/v1/tokens/{token_id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["id"] == token_id
    assert data["token_name"] == token_data["token_name"]


def test_get_token_not_found(client):
    """Test getting a non-existent token."""
    response = client.get("/api/v1/tokens/999")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_list_tokens(client):
    """Test listing token configurations."""
    # Create multiple tokens
    token_data = {
        "token_name": "Test Token",
        "token_symbol": "TEST",
        "decimals": 18,
        "total_supply": "1000000",
        "creator_wallet": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
    }
    
    for i in range(3):
        client.post("/api/v1/tokens/", json={
            **token_data,
            "token_name": f"Test Token {i}",
            "token_symbol": f"TEST{i}"
        })
    
    # Test listing with pagination
    response = client.get("/api/v1/tokens/?skip=0&limit=2")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2


def test_update_token(client):
    """Test updating a token configuration."""
    # First create a token
    token_data = {
        "token_name": "Test Token",
        "token_symbol": "TEST",
        "decimals": 18,
        "total_supply": "1000000",
        "creator_wallet": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
    }
    
    create_response = client.post("/api/v1/tokens/", json=token_data)
    token_id = create_response.json()["id"]
    
    # Update the token
    update_data = {
        "deployment_status": "deployed",
        "fee_paid_tx": "0xabc123"
    }
    
    response = client.patch(f"/api/v1/tokens/{token_id}", json=update_data)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    
    assert data["deployment_status"] == update_data["deployment_status"]
    assert data["fee_paid_tx"] == update_data["fee_paid_tx"]


def test_delete_token(client):
    """Test deleting a token configuration."""
    # First create a token
    token_data = {
        "token_name": "Test Token",
        "token_symbol": "TEST",
        "decimals": 18,
        "total_supply": "1000000",
        "creator_wallet": "0x4f1684A28E33F42cdf50AB96e29a709e17249E63"
    }
    
    create_response = client.post("/api/v1/tokens/", json=token_data)
    token_id = create_response.json()["id"]
    
    # Delete the token
    response = client.delete(f"/api/v1/tokens/{token_id}")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    
    # Verify token is deleted
    get_response = client.get(f"/api/v1/tokens/{token_id}")
    assert get_response.status_code == status.HTTP_404_NOT_FOUND 