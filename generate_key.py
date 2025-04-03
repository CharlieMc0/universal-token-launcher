from eth_account import Account
import secrets

# Enable the new account creation
Account.enable_unaudited_hdwallet_features()

# Generate a random private key
private_key = secrets.token_hex(32)

# Create an account from the private key
account = Account.from_key('0x' + private_key)

print(f"\nPrivate Key: 0x{private_key}")
print(f"Address: {account.address}") 