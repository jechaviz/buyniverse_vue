import { User, UserPermissions, UserType, TeamMember } from '@/types';

// --- PERMISSIONS LOGIC ---
export const getUserPermissions = (user: Omit<User, 'permissions'>, teamMembership?: TeamMember): UserPermissions => {
    const basePermissions = {
        canCreateProjects: false,
        canViewAllProjects: false,
        canEditWorkspaceSettings: false,
        canManageFinances: false,
        isWorkspaceAdmin: false,
    };

    switch (user.type) {
        case UserType.Admin:
            return {
                canCreateProjects: true,
                canViewAllProjects: true,
                canEditWorkspaceSettings: true,
                canManageFinances: true,
                isWorkspaceAdmin: true,
            };
        case UserType.Client:
            // This could be the workspace owner or a team member.
            const isOwner = !user.clientId || user.clientId === user.id;
            const canEdit = teamMembership?.permission === 'edit';

            return {
                ...basePermissions,
                canCreateProjects: isOwner || canEdit,
                canViewAllProjects: true,
                canEditWorkspaceSettings: isOwner || canEdit,
                canManageFinances: isOwner || canEdit,
                isWorkspaceAdmin: isOwner || canEdit,
            };
        case UserType.Freelancer:
            return basePermissions; // Freelancers have the most restricted permissions by default
        default:
            return basePermissions;
    }
}
