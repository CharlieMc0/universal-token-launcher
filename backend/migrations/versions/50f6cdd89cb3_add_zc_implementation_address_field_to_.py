"""Add zc_implementation_address field to TokenModel

Revision ID: 50f6cdd89cb3
Revises: 1a2b3c4d5e6f
Create Date: 2025-04-04 15:59:35.503443

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision = '50f6cdd89cb3'
down_revision = '1a2b3c4d5e6f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [col['name'] for col in inspector.get_columns('token_deployments')]
    
    if 'zc_implementation_address' not in columns:
        op.add_column('token_deployments', sa.Column('zc_implementation_address', sa.String(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('token_deployments', 'zc_implementation_address')
    # ### end Alembic commands ### 