import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Plus } from "@phosphor-icons/react";
import { useLoanProducts, useSaveLoanProduct } from "@/src/hooks/use-loan-products";
import { ProductsTable } from "./components/products-table";
import { ProductForm } from "./components/product-form";
import type { LoanProduct } from "./types";

export function LoanProductsPage() {
	const [isFormOpen, setIsFormOpen] = useState(false);
	const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null);

	const { data: products = [], isLoading, isError } = useLoanProducts();
	const saveMutation = useSaveLoanProduct();

	const handleEdit = (product: LoanProduct) => {
		setSelectedProduct(product);
		setIsFormOpen(true);
	};

	const handleCreate = () => {
		setSelectedProduct(null);
		setIsFormOpen(true);
	};

	const handleSubmit = async (data: LoanProduct) => {
		await saveMutation.mutateAsync(data);
		setIsFormOpen(false);
		setSelectedProduct(null);
	};

	return (
		<div className="flex flex-1 flex-col gap-6 p-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Loan Products Management</h1>
					<p className="text-muted-foreground">
						Configure product parameters, limits, and penalty rules.
					</p>
				</div>
				<Button onClick={handleCreate}>
					<Plus size={14} weight="bold" data-icon="inline-start" />
					New Product
				</Button>
			</div>

			{isLoading ? (
				<div className="flex h-40 items-center justify-center text-muted-foreground">
					Loading configurations...
				</div>
			) : isError ? (
				<div className="flex h-40 items-center justify-center text-red-600">
					Failed to load product data.
				</div>
			) : (
				<ProductsTable data={products} onEdit={handleEdit} />
			)}

			<ProductForm
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				product={selectedProduct}
				onSubmit={handleSubmit}
			/>
		</div>
	);
}
