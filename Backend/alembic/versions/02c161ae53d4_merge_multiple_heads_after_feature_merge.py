"""merge multiple heads after feature merge

Revision ID: 02c161ae53d4
Revises: 09b4cdf0f6d9, 9c8f0314e567
Create Date: 2026-07-24 18:34:29.628533

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '02c161ae53d4'
down_revision: Union[str, Sequence[str], None] = ('09b4cdf0f6d9', '9c8f0314e567')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
