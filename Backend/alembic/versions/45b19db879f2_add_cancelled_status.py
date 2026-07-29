"""Add CANCELLED status

Revision ID: 45b19db879f2
Revises: d3082373308f
Create Date: 2026-07-29 16:46:02.859054

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '45b19db879f2'
down_revision: Union[str, Sequence[str], None] = 'd3082373308f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE poststatus ADD VALUE IF NOT EXISTS 'CANCELLED'")
        op.execute("ALTER TYPE matchstatus ADD VALUE IF NOT EXISTS 'CANCELLED'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
