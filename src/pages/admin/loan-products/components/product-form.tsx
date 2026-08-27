import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/src/components/ui/sheet";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Field, FieldLabel, FieldError } from "@/src/components/ui/field";
import { Textarea } from "@/src/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { loanProductSchema, type LoanProduct } from "../types";

interface ProductFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	product?: LoanProduct | null;
	onSubmit: (data: LoanProduct) => Promise<void>;
}

/**
 * Reusable component for Min/Max pairs to maintain clean code.
 * Reduces repetition across all paired numeric fields.
 */
const MinMaxGroup = ({
	control,
	errors,
	label,
	minName,
	maxName,
	integerOnly,
}: {
	control: any;
	errors: any;
	label: string;
	minName: string;
	maxName: string;
	integerOnly?: boolean;
}) => (
	<div className="space-y-2">
		<p className="text-sm font-medium leading-none">{label}</p>
		<div className="grid grid-cols-2 gap-4">
			<Field>
				<FieldLabel className="text-xs text-muted-foreground">Min</FieldLabel>
				<Controller
					control={control}
					name={minName as any}
					render={({ field }) => (
						<Input
							type="number"
							step={integerOnly ? "1" : "0.01"}
							{...field}
							value={field.value ?? ""}
						/>
					)}
				/>
				{errors[minName] && <FieldError>{errors[minName]?.message}</FieldError>}
			</Field>
			<Field>
				<FieldLabel className="text-xs text-muted-foreground">Max</FieldLabel>
				<Controller
					control={control}
					name={maxName as any}
					render={({ field }) => (
						<Input
							type="number"
							step={integerOnly ? "1" : "0.01"}
							{...field}
							value={field.value ?? ""}
						/>
					)}
				/>
				{errors[maxName] && <FieldError>{errors[maxName]?.message}</FieldError>}
			</Field>
		</div>
	</div>
);

export function ProductForm({ open, onOpenChange, product, onSubmit }: ProductFormProps) {
	const {
		control,
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		reset,
	} = useForm<LoanProduct>({
		resolver: zodResolver(loanProductSchema),
		defaultValues: product ?? {
			productId: "",
			description: "",
			notes: "",
			hierarchyLevel: 0,
			displayOrder: 0,
			minLoanableAmount: 0,
			maxLoanableAmount: 0,
			minInterestRate: 0,
			maxInterestRate: 0,
			minServiceCharge: 0,
			maxServiceCharge: 0,
			minPenaltyFee: 0,
			maxPenaltyFee: 0,
			notarialFee: 0,
			collectionFee: 0,
			minLateAmortPenalty: 0,
			maxLateAmortPenalty: 0,
			minPdiPenalty: 0,
			maxPdiPenalty: 0,
			minPdpPenalty: 0,
			maxPdpPenalty: 0,
			minLoanTerm: 0,
			maxLoanTerm: 0,
			minPayInterval: 0,
			maxPayInterval: 0,
			minNoOfAmortizations: 0,
			maxNoOfAmortizations: 0,
			minDiscountDays: 0,
			maxDiscountDays: 0,
			minGracePeriod: 0,
			maxGracePeriod: 0,
			status: "Draft",
		},
	});

	const handleFormSubmit = handleSubmit(async (data) => {
		await onSubmit(data);
		onOpenChange(false);
		reset();
	});

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-2xl overflow-y-auto">
				<SheetHeader className="border-b bg-muted/30 p-6 pb-4">
					<SheetTitle>{product ? "Update Loan Product" : "Create Loan Product"}</SheetTitle>
					<SheetDescription>
						Configure the financial parameters and eligibility rules for this product.
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleFormSubmit} className="space-y-8 p-6">
					{/* 1. Basic Info */}
					<Card>
						<CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
						<CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<Field>
								<FieldLabel>Product ID *</FieldLabel>
								<Input {...register("productId")} placeholder="SAL-ADV-1M" />
								{errors.productId && <FieldError>{errors.productId?.message}</FieldError>}
							</Field>
							<Field>
								<FieldLabel>Parent ID</FieldLabel>
								<Input {...register("parentId")} placeholder="Optional" />
							</Field>
							<Field className="sm:col-span-2">
								<FieldLabel>Description *</FieldLabel>
								<Input {...register("description")} placeholder="Salary Advance (1 Month)" />
								{errors.description && <FieldError>{errors.description?.message}</FieldError>}
							</Field>
							<Field className="sm:col-span-2">
								<FieldLabel>Notes</FieldLabel>
								<Textarea {...register("notes")} rows={2} placeholder="Additional notes about this product..." />
							</Field>
							<Field>
								<FieldLabel>Status</FieldLabel>
								<Controller
									control={control}
									name="status"
									render={({ field }) => (
										<Select onValueChange={field.onChange} defaultValue={field.value}>
											<SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
											<SelectContent>
												<SelectItem value="Active">Active</SelectItem>
												<SelectItem value="Inactive">Inactive</SelectItem>
												<SelectItem value="Draft">Draft</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</Field>
							<Field>
								<FieldLabel>Hierarchy Level</FieldLabel>
								<Controller
									control={control}
									name="hierarchyLevel"
									render={({ field }) => (
										<Input type="number" step="1" {...field} value={field.value ?? 0} />
									)}
								/>
								{errors.hierarchyLevel && <FieldError>{errors.hierarchyLevel?.message}</FieldError>}
							</Field>
							<Field>
								<FieldLabel>Display Order</FieldLabel>
								<Controller
									control={control}
									name="displayOrder"
									render={({ field }) => (
										<Input type="number" step="1" {...field} value={field.value ?? 0} />
									)}
								/>
								{errors.displayOrder && <FieldError>{errors.displayOrder?.message}</FieldError>}
							</Field>
							<Field>
								<FieldLabel>Mapped MIS</FieldLabel>
								<Input {...register("mappedMis")} placeholder="GL-101" />
							</Field>
							<Field>
								<FieldLabel>Mapped CLS</FieldLabel>
								<Input {...register("mappedCls")} placeholder="CLS-01" />
							</Field>
							<Field>
								<FieldLabel>Mapped SEC</FieldLabel>
								<Input {...register("mappedSec")} placeholder="SEC-01" />
							</Field>
						</CardContent>
					</Card>

					{/* 2. Financial Ranges */}
					<Card>
						<CardHeader><CardTitle className="text-base">Amounts & Charges</CardTitle></CardHeader>
						<CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Loanable Amount"
								minName="minLoanableAmount"
								maxName="maxLoanableAmount"
							/>
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Interest Rate (%)"
								minName="minInterestRate"
								maxName="maxInterestRate"
							/>
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Service Charge"
								minName="minServiceCharge"
								maxName="maxServiceCharge"
							/>
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Penalty Fee"
								minName="minPenaltyFee"
								maxName="maxPenaltyFee"
							/>
							<Field>
								<FieldLabel>Notarial Fee</FieldLabel>
								<Controller
									control={control}
									name="notarialFee"
									render={({ field }) => (
										<Input type="number" step="0.01" {...field} value={field.value ?? 0} />
									)}
								/>
								{errors.notarialFee && <FieldError>{errors.notarialFee?.message}</FieldError>}
							</Field>
							<Field>
								<FieldLabel>Collection Fee</FieldLabel>
								<Controller
									control={control}
									name="collectionFee"
									render={({ field }) => (
										<Input type="number" step="0.01" {...field} value={field.value ?? 0} />
									)}
								/>
								{errors.collectionFee && <FieldError>{errors.collectionFee?.message}</FieldError>}
							</Field>
						</CardContent>
					</Card>

					{/* 3. Penalty Rates */}
					<Card>
						<CardHeader><CardTitle className="text-base">Penalty Rates (%)</CardTitle></CardHeader>
						<CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Late Amortization"
								minName="minLateAmortPenalty"
								maxName="maxLateAmortPenalty"
							/>
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Past Due Interest (PDI)"
								minName="minPdiPenalty"
								maxName="maxPdiPenalty"
							/>
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Past Due Principal (PDP)"
								minName="minPdpPenalty"
								maxName="maxPdpPenalty"
							/>
						</CardContent>
					</Card>

					{/* 4. Term Settings */}
					<Card>
						<CardHeader><CardTitle className="text-base">Term Settings</CardTitle></CardHeader>
						<CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Loan Term (Months)"
								minName="minLoanTerm"
								maxName="maxLoanTerm"
								integerOnly
							/>
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Payment Interval (Days)"
								minName="minPayInterval"
								maxName="maxPayInterval"
								integerOnly
							/>
							<MinMaxGroup
								control={control}
								errors={errors}
								label="No. of Amortizations"
								minName="minNoOfAmortizations"
								maxName="maxNoOfAmortizations"
								integerOnly
							/>
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Discount Days"
								minName="minDiscountDays"
								maxName="maxDiscountDays"
								integerOnly
							/>
							<MinMaxGroup
								control={control}
								errors={errors}
								label="Grace Period (Days)"
								minName="minGracePeriod"
								maxName="maxGracePeriod"
								integerOnly
							/>
						</CardContent>
					</Card>

					<SheetFooter className="flex flex-row gap-2 border-t bg-muted/10 p-4">
						<Button type="button" variant="outline" className="h-9" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" className="h-9" disabled={isSubmitting}>
							{isSubmitting ? "Saving Configuration..." : "Save Product"}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
