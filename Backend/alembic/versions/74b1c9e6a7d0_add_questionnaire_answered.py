"""add questionnaire_answered flag to profiles

Revision ID: 74b1c9e6a7d0
Revises: 02c161ae53d4_merge_multiple_heads_after_feature_merge
Create Date: 2026-07-25 23:30:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '74b1c9e6a7d0'
down_revision = '02c161ae53d4'
branch_labels = None
depends_on = None


def upgrade():
    # Add questionnaire_answered boolean column to host_profiles and guest_profiles
    op.add_column('host_profiles', sa.Column('questionnaire_answered', sa.Boolean(), nullable=False, server_default=sa.text('false')))
    op.add_column('guest_profiles', sa.Column('questionnaire_answered', sa.Boolean(), nullable=False, server_default=sa.text('false')))


def downgrade():
    op.drop_column('guest_profiles', 'questionnaire_answered')
    op.drop_column('host_profiles', 'questionnaire_answered')
