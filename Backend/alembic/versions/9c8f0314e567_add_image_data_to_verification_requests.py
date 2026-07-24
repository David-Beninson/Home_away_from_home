"""add image data columns to verification requests

Revision ID: 9c8f0314e567
Revises: 8b9f0213d456
Create Date: 2026-07-24 15:50:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9c8f0314e567'
down_revision = '8b9f0213d456'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('verification_requests', sa.Column('selfie_image_data', sa.Text(), nullable=True))
    op.add_column('verification_requests', sa.Column('document_image_data', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('verification_requests', 'document_image_data')
    op.drop_column('verification_requests', 'selfie_image_data')
