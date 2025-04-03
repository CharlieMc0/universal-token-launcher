"""Test script to verify created_at field inclusion in API responses."""

import asyncio
from sqlalchemy.orm import Session  # Used for type hints only

# Import required modules from the app
from app.models import TokenModel, UserTokenInfo
from app.services.token import token_service
from app.db import get_db


async def test_created_at_field():
    """Test that created_at is present in token and user token responses."""
    print("Testing created_at field inclusion in API responses...")
    
    # Get a database session
    db = next(get_db())
    
    # Get a token from the database
    token = db.query(TokenModel).first()
    if not token:
        print("No tokens found in the database!")
        return
    
    print(f"Found token: {token.token_name} (ID: {token.id})")
    
    # Test get_token_by_id
    token_data = await token_service.get_token_by_id(token.id, db)
    if not token_data:
        print(f"Error: Token with ID {token.id} not found in service!")
        return
    
    # Check if created_at is in the token data
    if "created_at" in token_data:
        print(f"✅ created_at field is present in token data: "
              f"{token_data['created_at']}")
    else:
        print("❌ created_at field is MISSING in token data!")
    
    # Create a sample UserTokenInfo to verify the schema
    try:
        user_token = UserTokenInfo(
            token_name=token.token_name,
            token_symbol=token.token_symbol,
            decimals=token.decimals,
            is_deployer=True,
            zc_contract_address=token.zc_contract_address,
            created_at=token_data.get("created_at"),
            balances=[]
        )
        print(f"✅ UserTokenInfo model accepts created_at field: "
              f"{user_token.created_at}")
    except Exception as e:
        print(f"❌ Error creating UserTokenInfo with created_at: {str(e)}")
    
    print("Test completed!")


if __name__ == "__main__":
    # Run the test
    asyncio.run(test_created_at_field()) 