"""merge heads

Revision ID: 008386a350ac
Revises: 0f56c2c647f9, 74b1c9e6a7d0
Create Date: 2026-07-29 16:01:55.535518

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008386a350ac'
down_revision: Union[str, Sequence[str], None] = ('0f56c2c647f9', '74b1c9e6a7d0')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
