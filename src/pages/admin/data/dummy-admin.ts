export const branches = ["Buhangin", "Bacolod", "Cagayan De Oro", "Bayugan", "Tandag", "Valencia", "Matina"];

export const roles = [
    { id: "role_admin", name: "Administrator", description: "Full system access" },
    { id: "role_area_head", name: "Area Head", description: "Regional loan approval" },
    { id: "role_branch_head", name: "Branch Head", description: "Branch loan recommendation" },
    { id: "role_checker", name: "Credit Checker", description: "Credit evaluation" },
    { id: "role_ao", name: "AO / CAA", description: "Loan encoding and processing" },
];

export const permissionModules = [
    {
        module: "Loan Origination",
        permissions: [
            { id: "loan.create", name: "Create / Encode Loan" },
            { id: "loan.recommend", name: "Recommend Loan" },
            { id: "loan.evaluate", name: "Evaluate / Credit Check" },
            { id: "loan.approve", name: "Approve Loan" },
            { id: "loan.reject", name: "Reject Loan" },
            { id: "loan.disburse", name: "Disburse Funds" },
        ]
    },
    {
        module: "User & Branch Management",
        permissions: [
            { id: "user.create", name: "Create User" },
            { id: "user.edit", name: "Edit User Details" },
            { id: "user.suspend", name: "Suspend / Activate User" },
            { id: "role.manage", name: "Manage Roles & Permissions" },
        ]
    },
    {
        module: "Reports & Audit",
        permissions: [
            { id: "report.view.branch", name: "View Branch Reports" },
            { id: "report.view.regional", name: "View Regional Reports" },
            { id: "audit.log.view", name: "View System Audit Logs" },
        ]
    }
];

export const dummyUsers = [
    { id: "USR-001", fullName: "Maria Santos", employeeId: "EMP-10042", email: "m.santos@ebank.com.ph", branch: "Matina", role: "Branch Head", status: "Active", lastActive: "2026-08-24 08:15 AM" },
    { id: "USR-002", fullName: "Juan Dela Cruz", employeeId: "EMP-10043", email: "j.delacruz@ebank.com.ph", branch: "Buhangin", role: "AO / CAA", status: "Active", lastActive: "2026-08-24 09:30 AM" },
    { id: "USR-003", fullName: "Ana Reyes", employeeId: "EMP-10044", email: "a.reyes@ebank.com.ph", branch: "Cagayan De Oro", role: "Credit Checker", status: "Active", lastActive: "2026-08-24 10:00 AM" },
    { id: "USR-004", fullName: "Gilas Roxas", employeeId: "EMP-10045", email: "g.roxas@ebank.com.ph", branch: "Bacolod", role: "Area Head", status: "Active", lastActive: "2026-08-23 04:45 PM" },
    { id: "USR-005", fullName: "Maya Mercado", employeeId: "EMP-10046", email: "m.mercado@ebank.com.ph", branch: "Matina", role: "Administrator", status: "Active", lastActive: "2026-08-24 07:00 AM" },
    { id: "USR-006", fullName: "Kate Silang", employeeId: "EMP-10047", email: "k.silang@ebank.com.ph", branch: "Buhangin", role: "Branch Head", status: "Suspended", lastActive: "2026-08-20 02:15 PM" },
    { id: "USR-007", fullName: "Twinkle Soriano", employeeId: "EMP-10048", email: "t.soriano@ebank.com.ph", branch: "Valencia", role: "AO / CAA", status: "Active", lastActive: "2026-08-24 08:45 AM" },
    { id: "USR-008", fullName: "Sampa Flores", employeeId: "EMP-10049", email: "s.flores@ebank.com.ph", branch: "Tandag", role: "Credit Checker", status: "Active", lastActive: "2026-08-24 09:10 AM" },
    { id: "USR-009", fullName: "Blessica Macaraeg", employeeId: "EMP-10050", email: "b.macaraeg@ebank.com.ph", branch: "Bayugan", role: "Area Head", status: "Active", lastActive: "2026-08-24 11:00 AM" },
    { id: "USR-010", fullName: "Mac Dalisay", employeeId: "EMP-10051", email: "m.dalisay@ebank.com.ph", branch: "Valencia", role: "Administrator", status: "Active", lastActive: "2026-08-24 06:30 AM" },
];

export type AdminUser = typeof dummyUsers[0];