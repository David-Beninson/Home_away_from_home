"""add_user_verification_system

Revision ID: 7a8f9102c345
Revises: 04af2f426d6b
Create Date: 2026-07-24 15:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7a8f9102c345'
down_revision: Union[str, Sequence[str], None] = 'c976e11f95b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add verification_status to users table
    op.add_column(
        'users',
        sa.Column(
            'verification_status',
            sa.String(length=32),
            server_default=sa.text("'pending_submission'"),
            nullable=False
        )
    )

    # Create verification_requests table
    op.create_table(
        'verification_requests',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('selfie_image_path', sa.String(length=512), nullable=False),
        sa.Column('document_image_path', sa.String(length=512), nullable=False),
        sa.Column('verification_type', sa.String(length=32), nullable=False, server_default=sa.text("'civilian'")),
        sa.Column('status', sa.String(length=32), nullable=False, server_default=sa.text("'pending_ai'")),
        sa.Column('ai_confidence_score', sa.Float(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_verification_requests_user_id'), 'verification_requests', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_verification_requests_user_id'), table_name='verification_requests')
    op.drop_table('verification_requests')
    op.drop_column('users', 'verification_status')
