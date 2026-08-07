import { Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { fetchUsers } from '@/lib/users.queries'
import { PageShell } from '@/components/layout/PageShell'
import { UserFiltersBar } from '@/components/users/UserFilters'
import { UserTable } from '@/components/users/UserTable'
import { Pagination } from '@/components/ui/Pagination'
import { PermissionGate } from '@/components/guards/PermissionGate'
import {
  SuspendDialog, ReactivateDialog, DeleteUserDialog,
  ResetPasswordDialog, ChangeRoleDialog, ChangeSubscriptionDialog,
} from '@/components/users/UserActions'
import type { AdminUser, UserFilters } from '@/lib/users.queries'

const PAGE_SIZE = 20

type ActiveAction = 'suspend' | 'reactivate' | 'delete' | 'reset_pw' | 'change_role' | 'change_sub' | null

export function UsersPage() {
  const [filters, setFilters] = useState<UserFilters>({ search: '', role: '', plan: '', status: '' })
  const [page, setPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [action, setAction] = useState<ActiveAction>(null)

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['users', filters, page],
    queryFn: () => fetchUsers(filters, page, PAGE_SIZE),
    placeholderData: (prev) => prev,
  })

  const handleAction = (user: AdminUser, a: ActiveAction) => {
    setSelectedUser(user)
    setAction(a)
  }
  const closeAction = () => { setAction(null); setSelectedUser(null) }

  // Reset page on filter change
  const handleFilters = (f: UserFilters) => {
    setFilters(f)
    setPage(0)
  }

  return (
    <PageShell
      title="Users"
      description="Manage registered users, roles, and subscriptions."
      icon={Users}
    >
      {/* Filters */}
      <UserFiltersBar filters={filters} onChange={handleFilters} />

      {/* Table */}
      <div className={isFetching && !isLoading ? 'opacity-70 transition-opacity' : ''}>
        <UserTable
          users={data?.data ?? []}
          loading={isLoading}
          onSuspend={(u) => handleAction(u, 'suspend')}
          onReactivate={(u) => handleAction(u, 'reactivate')}
          onDelete={(u) => handleAction(u, 'delete')}
          onResetPassword={(u) => handleAction(u, 'reset_pw')}
          onChangeRole={(u) => handleAction(u, 'change_role')}
          onChangeSubscription={(u) => handleAction(u, 'change_sub')}
        />
      </div>

      {/* Pagination */}
      {!isLoading && (data?.total ?? 0) > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data?.total ?? 0}
          onChange={setPage}
        />
      )}

      {/* Action dialogs */}
      {selectedUser && (
        <>
          <SuspendDialog         user={selectedUser} open={action === 'suspend'}     onClose={closeAction} />
          <ReactivateDialog      user={selectedUser} open={action === 'reactivate'}  onClose={closeAction} />
          <DeleteUserDialog      user={selectedUser} open={action === 'delete'}      onClose={closeAction} />
          <ResetPasswordDialog   user={selectedUser} open={action === 'reset_pw'}    onClose={closeAction} />
          <ChangeRoleDialog      user={selectedUser} open={action === 'change_role'} onClose={closeAction} />
          <ChangeSubscriptionDialog
            user={selectedUser}
            subscriptionId={null}
            open={action === 'change_sub'}
            onClose={closeAction}
          />
        </>
      )}
    </PageShell>
  )
}
