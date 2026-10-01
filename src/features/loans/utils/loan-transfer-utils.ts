

export type LoanSection = "outstanding" | "ebi" | "buyout" | "incoming";

export type OutstandingFormRow = {
    pn: string;
    principalBalance: number;
    amortization: number;
    outstandingBalance: number;
    dateGranted: string;
    dateMaturity: string;
    status: string;
    
    productWithDescription: string;
};

export type EbiReloanFormRow = {
    pn: string;
    name: string;
    existingDeduction: number;
    outstandingBalance: number;
    
    
    
    
    payToClose: number;
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    dateGranted?: string;
    dateMaturity?: string;
    sourceStatus?: string;
};

export type BuyOutFormRow = {
    pn: string;
    name: string;
    amortization: number;
    outstandingBalance: number;
};

export type IncomingFormRow = {
    name: string;
    deductions: number;
    remarks: string;
};

export const LOAN_SECTION_LABELS: Record<LoanSection, string> = {
    outstanding: "Outstanding Loans",
    ebi: "EBI Reloans",
    buyout: "Buy-Outs (Other FIs)",
    incoming: "Incoming / Undeducted",
};


export type TransferSourceRow = {
    [key: string]: unknown;
    pn?: unknown;
    name?: unknown;
    status?: unknown;
    productWithDescription?: unknown;
    sourceStatus?: unknown;
    dateGranted?: unknown;
    dateMaturity?: unknown;
    amortization?: unknown;
    existingDeduction?: unknown;
    deductions?: unknown;
    outstandingBalance?: unknown;
};


function safeNumber(value: unknown): number {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        return Number(value);
    }
    return 0;
}

function safeString(value: unknown, fallback = ""): string {
    if (typeof value === "string") return value;
    if (value == null) return fallback;
    return String(value);
}



export function mapToOutstanding(row: TransferSourceRow, source: LoanSection): OutstandingFormRow {
    const defaults: OutstandingFormRow = {
        pn: "",
        principalBalance: 0,
        amortization: 0,
        outstandingBalance: 0,
        dateGranted: "",
        dateMaturity: "",
        status: "",
        productWithDescription: "",
    };

    if (source === "ebi") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            
            status:
                safeString(row?.sourceStatus) ||
                safeString(row?.name),
            amortization: safeNumber(row?.existingDeduction),
            outstandingBalance: safeNumber(row?.outstandingBalance),
            principalBalance: safeNumber(row?.outstandingBalance),
            
            
            
            
            
            
            
            
            
            
            dateGranted: safeString(row?.dateGranted),
            dateMaturity: safeString(row?.dateMaturity),
        };
    }

    if (source === "buyout") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            status: safeString(row?.name),
            amortization: safeNumber(row?.amortization),
            outstandingBalance: safeNumber(row?.outstandingBalance),
            principalBalance: safeNumber(row?.outstandingBalance),
        };
    }

    if (source === "incoming") {
        return {
            ...defaults,
            status: safeString(row?.name),
            amortization: safeNumber(row?.deductions),
            outstandingBalance: safeNumber(row?.deductions),
            principalBalance: safeNumber(row?.deductions),
        };
    }

    
    return { ...defaults, ...(row as Partial<OutstandingFormRow>) };
}



export function mapToEbi(row: TransferSourceRow, source: LoanSection): EbiReloanFormRow {
    const defaults: EbiReloanFormRow = {
        pn: "",
        name: "",
        existingDeduction: 0,
        outstandingBalance: 0,
        payToClose: 0,
    };

    if (source === "outstanding") {
        
        
        const productDesc = safeString(row?.productWithDescription);
        const fallbackStatus = safeString(row?.status);

        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: productDesc || fallbackStatus,
            existingDeduction: safeNumber(row?.amortization),
            outstandingBalance: safeNumber(row?.outstandingBalance),
            
            
            
            
            
            
            
            
            
            
            dateGranted: safeString(row?.dateGranted),
            dateMaturity: safeString(row?.dateMaturity),
            
            
            
            
            
            
            
            sourceStatus: safeString(row?.status),
        };
    }

    if (source === "buyout") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: safeString(row?.name),
            existingDeduction: safeNumber(row?.amortization),
            outstandingBalance: safeNumber(row?.outstandingBalance),
        };
    }

    if (source === "incoming") {
        return {
            ...defaults,
            name: safeString(row?.name),
            existingDeduction: safeNumber(row?.deductions),
            
            
            outstandingBalance: 0,
        };
    }

    return { ...defaults, ...(row as Partial<EbiReloanFormRow>) };
}



export function mapToBuyOut(row: TransferSourceRow, source: LoanSection): BuyOutFormRow {
    const defaults: BuyOutFormRow = {
        pn: "",
        name: "",
        amortization: 0,
        outstandingBalance: 0,
    };

    if (source === "outstanding") {
        
        
        
        
        
        const productDesc = safeString(row?.productWithDescription);
        const fallbackStatus = safeString(row?.status);
        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: productDesc || fallbackStatus,
            amortization: safeNumber(row?.amortization),
            outstandingBalance: safeNumber(row?.outstandingBalance),
        };
    }

    if (source === "ebi") {
        return {
            ...defaults,
            pn: safeString(row?.pn),
            name: safeString(row?.name),
            amortization: safeNumber(row?.existingDeduction),
            outstandingBalance: safeNumber(row?.outstandingBalance),
        };
    }

    if (source === "incoming") {
        return {
            ...defaults,
            name: safeString(row?.name),
            amortization: safeNumber(row?.deductions),
            outstandingBalance: 0,
        };
    }

    return { ...defaults, ...(row as Partial<BuyOutFormRow>) };
}



export function mapToIncoming(row: TransferSourceRow, source: LoanSection): IncomingFormRow {
    const defaults: IncomingFormRow = {
        name: "",
        deductions: 0,
        remarks: "",
    };

    if (source === "outstanding") {
        
        
        
        
        
        
        const productDesc = safeString(row?.productWithDescription);
        const fallbackStatus = safeString(row?.status);
        return {
            ...defaults,
            name: productDesc || fallbackStatus,
            deductions: safeNumber(row?.amortization),
            remarks: safeString(row?.pn),
        };
    }

    if (source === "ebi") {
        return {
            ...defaults,
            name: safeString(row?.name),
            deductions: safeNumber(row?.existingDeduction),
            remarks: safeString(row?.pn),
        };
    }

    if (source === "buyout") {
        return {
            ...defaults,
            name: safeString(row?.name),
            deductions: safeNumber(row?.amortization),
            remarks: safeString(row?.pn),
        };
    }

    return { ...defaults, ...(row as Partial<IncomingFormRow>) };
}
