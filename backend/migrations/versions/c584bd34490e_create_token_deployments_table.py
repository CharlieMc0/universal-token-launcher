"""create_token_deployments_table

Revision ID: c584bd34490e
Revises: 
Create Date: 2025-04-02 11:13:03.007435

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c584bd34490e'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('SequelizeMeta')
    op.add_column('token_deployments', sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.add_column('token_deployments', sa.Column('updated_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=False))
    op.alter_column('token_deployments', 'token_name',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.alter_column('token_deployments', 'token_symbol',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.alter_column('token_deployments', 'decimals',
               existing_type=sa.INTEGER(),
               nullable=False)
    op.alter_column('token_deployments', 'total_supply',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.alter_column('token_deployments', 'deployer_address',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.alter_column('token_deployments', 'connected_chains_json',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=False)
    op.alter_column('token_deployments', 'deployment_status',
               existing_type=sa.VARCHAR(length=255),
               nullable=False)
    op.create_index(op.f('ix_token_deployments_id'), 'token_deployments', ['id'], unique=False)
    op.drop_column('token_deployments', 'createdAt')
    op.drop_column('token_deployments', 'updatedAt')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('token_deployments', sa.Column('updatedAt', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False))
    op.add_column('token_deployments', sa.Column('createdAt', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=False))
    op.drop_index(op.f('ix_token_deployments_id'), table_name='token_deployments')
    op.alter_column('token_deployments', 'deployment_status',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.alter_column('token_deployments', 'connected_chains_json',
               existing_type=postgresql.JSONB(astext_type=sa.Text()),
               nullable=True)
    op.alter_column('token_deployments', 'deployer_address',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.alter_column('token_deployments', 'total_supply',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.alter_column('token_deployments', 'decimals',
               existing_type=sa.INTEGER(),
               nullable=True)
    op.alter_column('token_deployments', 'token_symbol',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.alter_column('token_deployments', 'token_name',
               existing_type=sa.VARCHAR(length=255),
               nullable=True)
    op.drop_column('token_deployments', 'updated_at')
    op.drop_column('token_deployments', 'created_at')
    op.create_table('SequelizeMeta',
    sa.Column('name', sa.VARCHAR(length=255), autoincrement=False, nullable=False),
    sa.PrimaryKeyConstraint('name', name='SequelizeMeta_pkey')
    )
    # ### end Alembic commands ### 