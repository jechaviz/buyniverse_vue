import { AppState, Action, JobStatus, ProposalStatus, MilestoneStatus, UserType, ApprovalStatus, TaskStatus, LeadStatus, FileCategory } from '@/types';
import { getUserPermissions } from '@/utils/permissions';
import { initialState } from './initialState';

export const appReducer = (state: AppState, action: Action): AppState => {
    switch (action.type) {
        case 'SWITCH_TO_USER':
            const userToSwitch = state.users.find(u => u.id === action.payload.userId);
            if (userToSwitch) {
                return { ...state, currentUser: userToSwitch };
            }
            return state;

        case 'TOGGLE_SAVE_JOB': {
            if (state.currentUser.type !== UserType.Freelancer) return state;
            const savedJobs = state.currentUser.savedJobs || [];
            const newSavedJobs = savedJobs.includes(action.payload.jobId)
                ? savedJobs.filter(id => id !== action.payload.jobId)
                : [...savedJobs, action.payload.jobId];
            
            const updatedUser = { ...state.currentUser, savedJobs: newSavedJobs };
            return {
                ...state,
                currentUser: updatedUser,
                users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u),
            };
        }
        
        case 'UPDATE_JOB':
        case 'UPDATE_JOB_DRAFT':
             return {
                ...state,
                jobs: state.jobs.map(j => j.id === action.payload.jobId ? { ...j, ...action.payload.data } : j),
            };

        case 'ADD_PROPOSAL':
            return {
                ...state,
                jobs: state.jobs.map(job =>
                    job.id === action.payload.proposal.jobId
                        ? { ...job, proposals: [...job.proposals, action.payload.proposal] }
                        : job
                ),
                conversations: [...state.conversations, action.payload.conversation],
                notifications: [...state.notifications, action.payload.notification],
            };
            
        case 'HIRE_FREELANCER':
            return {
                ...state,
                jobs: state.jobs.map(job =>
                    job.id === action.payload.jobId
                        ? {
                            ...job,
                            status: JobStatus.InProgress,
                            contractId: action.payload.contract.id,
                            proposals: job.proposals.map(p =>
                                p.id === action.payload.proposalId
                                    ? { ...p, status: ProposalStatus.Accepted }
                                    : { ...p, status: ProposalStatus.Rejected }
                            )
                        }
                        : job
                ),
                contracts: [...state.contracts, action.payload.contract],
                notifications: [...state.notifications, action.payload.notification],
            };
        
        case 'MARK_JOB_COMPLETE': {
            return {
                ...state,
                jobs: state.jobs.map(j => j.id === action.payload.jobId ? { ...j, status: JobStatus.Completed } : j),
                contracts: state.contracts.map(c => c.id === action.payload.contractId ? { ...c, endedAt: new Date() } : c),
                notifications: [...state.notifications, action.payload.clientNotification, action.payload.freelancerNotification],
                invoices: [...state.invoices, action.payload.invoice],
            };
        }

        case 'CREATE_MILESTONE': {
            return {
                ...state,
                contracts: state.contracts.map(c =>
                    c.id === action.payload.contractId
                        ? { ...c, milestones: [...c.milestones, action.payload.milestone] }
                        : c
                )
            };
        }

        case 'FUND_MILESTONE':
        case 'REQUEST_MILESTONE_PAYMENT':
        case 'RELEASE_MILESTONE_PAYMENT': {
            const statusMap = {
                'FUND_MILESTONE': MilestoneStatus.Funded,
                'REQUEST_MILESTONE_PAYMENT': MilestoneStatus.Requested,
                'RELEASE_MILESTONE_PAYMENT': MilestoneStatus.Released,
            };

            const newState = {
                ...state,
                contracts: state.contracts.map(c => {
                    if (c.id === action.payload.contractId) {
                        return {
                            ...c,
                            milestones: c.milestones.map(m =>
                                m.id === action.payload.milestoneId ? { ...m, status: statusMap[action.type] } : m
                            )
                        };
                    }
                    return c;
                }),
                notifications: [...state.notifications, action.payload.notification],
            };

            if (action.type === 'RELEASE_MILESTONE_PAYMENT') {
                newState.transactions = [...state.transactions, action.payload.transaction];
            }

            return newState;
        }

        case 'CREATE_TASK': {
             return {
                ...state,
                contracts: state.contracts.map(c => {
                    if (c.id === action.payload.contractId) {
                        return {
                            ...c,
                            milestones: c.milestones.map(m =>
                                m.id === action.payload.milestoneId ? { ...m, tasks: [...m.tasks, action.payload.task] } : m
                            )
                        };
                    }
                    return c;
                })
            };
        }
        
        case 'UPDATE_TASK_STATUS': {
            return {
                ...state,
                contracts: state.contracts.map(c => {
                    if (c.id === action.payload.contractId) {
                        return {
                            ...c,
                            milestones: c.milestones.map(m => {
                                if (m.id === action.payload.milestoneId) {
                                    return {
                                        ...m,
                                        tasks: m.tasks.map(t =>
                                            t.id === action.payload.taskId ? { ...t, status: action.payload.newStatus } : t
                                        )
                                    };
                                }
                                return m;
                            })
                        };
                    }
                    return c;
                })
            };
        }
        
        case 'APPROVE_JOB': {
            const newJobs = state.jobs.map(j => {
                if (j.id === action.payload.jobId) {
                    const newApprovers = j.approvers.map(a => a.userId === action.payload.approverId ? { ...a, status: ApprovalStatus.Approved } : a);
                    const allApproved = newApprovers.every(a => a.status === ApprovalStatus.Approved);
                    return { ...j, approvers: newApprovers, status: allApproved ? JobStatus.Open : j.status };
                }
                return j;
            });
            return {
                ...state,
                jobs: newJobs,
                notifications: [...state.notifications, action.payload.notification]
            };
        }
        
        case 'REJECT_JOB': {
             const newJobs = state.jobs.map(j => {
                if (j.id === action.payload.jobId) {
                    const newApprovers = j.approvers.map(a => a.userId === action.payload.approverId ? { ...a, status: ApprovalStatus.Rejected, rejectionReason: action.payload.reason } : a);
                    return { ...j, approvers: newApprovers, status: JobStatus.Rejected };
                }
                return j;
            });
            return {
                ...state,
                jobs: newJobs,
                notifications: [...state.notifications, action.payload.notification]
            };
        }
        
        case 'CREATE_JOB_DRAFT':
            return {
                ...state,
                jobs: [...state.jobs, action.payload],
            };

        case 'ADD_WIDGET': {
            const { tableId, categoryId, newCategoryTitle, widget } = action.payload;
            const newLayouts = { ...state.dashboardLayouts };
            const tableLayout = [...(newLayouts[tableId] || [])];
            
            let targetCategoryId = categoryId;

            if (newCategoryTitle) {
                const newCategory = { id: `cat-${Date.now()}`, title: newCategoryTitle, widgets: [] };
                tableLayout.push(newCategory);
                targetCategoryId = newCategory.id;
            }

            const targetCategoryIndex = tableLayout.findIndex(c => c.id === targetCategoryId);
            if (targetCategoryIndex !== -1) {
                tableLayout[targetCategoryIndex].widgets.push(widget);
            } else if (tableLayout.length > 0) {
                 tableLayout[0].widgets.push(widget);
            } else {
                 tableLayout.push({ id: `cat-${Date.now()}`, title: 'Default', widgets: [widget] });
            }
            
            newLayouts[tableId] = tableLayout;

            return { ...state, dashboardLayouts: newLayouts };
        }

        case 'UPDATE_WIDGET': {
             const { tableId, widget } = action.payload;
             const newLayouts = { ...state.dashboardLayouts };
             const tableLayout = (newLayouts[tableId] || []).map(category => ({
                ...category,
                widgets: category.widgets.map(w => w.id === widget.id ? widget : w)
             }));
             newLayouts[tableId] = tableLayout;
             return { ...state, dashboardLayouts: newLayouts };
        }

        case 'DELETE_WIDGET': {
            const { tableId, widgetId } = action.payload;
            const newLayouts = { ...state.dashboardLayouts };
            const tableLayout = (newLayouts[tableId] || []).map(category => ({
                ...category,
                widgets: category.widgets.filter(w => w.id !== widgetId)
            })).filter(category => category.widgets.length > 0);
            newLayouts[tableId] = tableLayout;
            return { ...state, dashboardLayouts: newLayouts };
        }
        
        case 'UPDATE_ENTITY': {
            const { entity, id, data } = action.payload;
            if (!state[entity] || !Array.isArray(state[entity])) return state;
            
            const updatedEntity = (state[entity] as any[]).map(item =>
                item.id === id ? { ...item, ...data } : item
            );

            return { ...state, [entity]: updatedEntity };
        }
        
        case 'BULK_UPDATE_LEAD_STATUS': {
            return {
                ...state,
                leads: state.leads.map(lead => 
                    action.payload.leadIds.includes(lead.id) ? { ...lead, status: action.payload.status } : lead
                )
            };
        }
        
        case 'REORDER_MILESTONE_CATEGORIES': {
            return {
                ...state,
                jobs: state.jobs.map(job => {
                    if (job.id === action.payload.projectId) {
                        const newOrderMap = new Map(action.payload.orderedCategoryIds.map((id, index) => [id, index]));
                        const sortedCategories = [...job.milestoneCategories].sort((a,b) => (newOrderMap.get(a.id) ?? 99) - (newOrderMap.get(b.id) ?? 99));
                        return { ...job, milestoneCategories: sortedCategories };
                    }
                    return job;
                })
            }
        }
        
        case 'ADD_INVOICE':
            return { ...state, invoices: [...state.invoices, action.payload.invoice] };
        
        case 'UPDATE_INVOICE':
             return { ...state, invoices: state.invoices.map(i => i.id === action.payload.invoice.id ? action.payload.invoice : i) };

        case 'CANCEL_INVOICE': {
            return {
                ...state,
                invoices: state.invoices.map(i => i.id === action.payload.invoiceId ? { ...i, status: 'Cancelado', cancellationDetails: { motive: action.payload.motive, replacementUuid: action.payload.replacementUuid } } : i)
            };
        }
        
        case 'ADD_PAYMENT_RECEIPT':
            return { ...state, paymentReceipts: [...state.paymentReceipts, action.payload.payment] };
        
        case 'UPDATE_PAYMENT_RECEIPT':
            return { ...state, paymentReceipts: state.paymentReceipts.map(p => p.id === action.payload.payment.id ? action.payload.payment : p) };

        case 'ADD_JOB': {
            return {
                ...state,
                jobs: [...state.jobs, action.payload]
            }
        }
        
        case 'UPDATE_ISSUER': {
            const existing = state.issuers.find(i => i.id === action.payload.issuer.id);
            if (existing) {
                return { ...state, issuers: state.issuers.map(i => i.id === action.payload.issuer.id ? action.payload.issuer : i) };
            }
            return { ...state, issuers: [...state.issuers, action.payload.issuer] };
        }
        
        case 'PURCHASE_FOLIOS': {
             const updatedUser = { ...state.currentUser, folioBalance: (state.currentUser.folioBalance || 0) + action.payload.amount };
             return {
                ...state,
                currentUser: updatedUser,
                users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u),
            };
        }
        
        case 'UPDATE_USER_SETTINGS': {
            const updatedUserSettings = {
                ...state.currentUser.settings,
                ...action.payload,
            };
            const updatedUser = {
                ...state.currentUser,
                settings: updatedUserSettings,
            };
            return {
                ...state,
                currentUser: updatedUser,
                users: state.users.map(u => u.id === updatedUser.id ? updatedUser : u),
            };
        }

        case 'UPDATE_JOB_PROGRESS': {
            return {
                ...state,
                jobs: state.jobs.map(j => j.id === action.payload.jobId ? { ...j, progress: action.payload.progress } : j)
            };
        }

        default:
            return state;
    }
};