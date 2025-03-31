"""Initial migration

Revision ID: 001
Revises:
Create Date: 2023-10-01

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create token_configurations table
    op.create_table(
        'token_configurations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('creator_wallet', sa.String(), nullable=False),
        sa.Column('token_name', sa.String(), nullable=False),
        sa.Column('token_symbol', sa.String(), nullable=False),
        sa.Column('icon_url', sa.String(), nullable=True),
        sa.Column('decimals', sa.Integer(), nullable=False),
        sa.Column('total_supply', sa.Numeric(), nullable=False),
        sa.Column('csv_data', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('fee_paid_tx', sa.String(), nullable=True),
        sa.Column('deployment_status', sa.String(), server_default='pending', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_token_configurations_creator_wallet'), 'token_configurations', ['creator_wallet'], unique=False)
    op.create_index(op.f('ix_token_configurations_id'), 'token_configurations', ['id'], unique=False)

    # Create token_distributions table
    op.create_table(
        'token_distributions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token_config_id', sa.Integer(), nullable=False),
        sa.Column('recipient_address', sa.String(), nullable=False),
        sa.Column('chain_id', sa.String(), nullable=False),
        sa.Column('token_amount', sa.Numeric(), nullable=False),
        sa.Column('status', sa.String(), server_default='pending', nullable=True),
        sa.Column('transaction_hash', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['token_config_id'], ['token_configurations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_token_distributions_id'), 'token_distributions', ['id'], unique=False)

    # Create deployment_logs table
    op.create_table(
        'deployment_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token_config_id', sa.Integer(), nullable=False),
        sa.Column('chain_name', sa.String(), nullable=False),
        sa.Column('chain_id', sa.String(), nullable=False),
        sa.Column('contract_address', sa.String(), nullable=True),
        sa.Column('status', sa.String(), server_default='pending', nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['token_config_id'], ['token_configurations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deployment_logs_id'), 'deployment_logs', ['id'], unique=False)

    # Create transfer_transactions table
    op.create_table(
        'transfer_transactions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_wallet', sa.String(), nullable=False),
        sa.Column('token_config_id', sa.Integer(), nullable=False),
        sa.Column('source_chain', sa.String(), nullable=False),
        sa.Column('destination_chain', sa.String(), nullable=False),
        sa.Column('token_amount', sa.Numeric(), nullable=False),
        sa.Column('transaction_hash', sa.String(), nullable=True),
        sa.Column('status', sa.String(), server_default='pending', nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['token_config_id'], ['token_configurations.id']),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_transfer_transactions_id'), 'transfer_transactions', ['id'], unique=False)
    op.create_index(op.f('ix_transfer_transactions_user_wallet'), 'transfer_transactions', ['user_wallet'], unique=False)


def downgrade() -> None:
    op.drop_table('transfer_transactions')
    op.drop_table('deployment_logs')
    op.drop_table('token_distributions')
    op.drop_table('token_configurations')
