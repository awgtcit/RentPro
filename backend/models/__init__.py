"""SQLAlchemy model imports — import all models here so Alembic can discover them."""

from models.user import User, Role, Permission, UserRole, RolePermission  # noqa
from models.property import Building, Flat, Room, Bedspace  # noqa
from models.tenant import Tenant, TenantDocument  # noqa
from models.assignment import Assignment  # noqa
from models.billing import Invoice, InvoiceItem, Payment, PaymentAllocation  # noqa
from models.deposit import Deposit, DepositTransaction  # noqa
from models.maintenance import MaintenanceRequest  # noqa
from models.audit import AuditLog  # noqa
from models.notification import Notification  # noqa
