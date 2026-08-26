import * as React from "react";
import {cn} from "@/src/lib/utils"
import {
    Field,
    FieldGroup, FieldLabel
} from "@/src/components/ui/field"
import {Input} from "@/src/components/ui/input";
import {Button} from "@/src/components/ui/button";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {CircleNotch, Eye, EyeSlash} from "@phosphor-icons/react";
import {useNavigate} from "react-router-dom";
import {useAuthStore} from "@/src/store/authStore";

const loginSchema = z.object({
    employeeId: z.string()
        .min(3, "Employee ID is required")
        .max(50),
    password: z.string()
        .min(8, "Invalid credentials")
        .max(100)
});

type LoginFormData = z.infer<typeof loginSchema>;

export  function LoginForm({className, ...props}: React.ComponentProps<"form">) {
    const [showPassword, setShowPassword] = React.useState(false);
    const navigate = useNavigate();
    const setSession = useAuthStore((state) => state.setSession);
    const {register, handleSubmit, formState: {errors, isSubmitting}} = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: "onBlur"
    });
    const onSubmit = (data: LoginFormData) => {
        // Mock login - set admin session with full permissions
        setSession("mock-access-token", {
            userId: "USR-005",
            firstName: "Maya",
            middleName: "",
            lastName: "Mercado",
            branchId: "Matina",
            permissions: ["*"], // Super admin bypass
        });
        navigate("/dashboard", { replace: true });
    };
    return (
        <form onSubmit={handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Login to your account</h1>
                    <p className="text-sm text-balance text-muted-foreground">
                        Enter your credentials below.
                    </p>
                </div>
                <Field>
                    <FieldLabel htmlFor="employeeId">Employee ID</FieldLabel>
                    <Input
                    id="employeeId"
                    placeholder="Employee ID"
                    autoComplete="employeeId"
                        {...register("employeeId")}/>
                    {errors.employeeId && (
                        <p className="text-xs text-red-500 mt-1">{errors.employeeId.message}</p>
                    )}
                </Field>
                <Field>
                    <div className="flex items-center justify-between">
                        <FieldLabel htmlFor="password">Password</FieldLabel>
                        <a href="/support" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                            Forgot password?
                        </a>
                    </div>
                    <div className="relative">
                        <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
                            autoComplete="current-password"
                            {...register("password")}/>
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeSlash size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {errors.password && (<p className="text-xs text-red-500 mt-1">Invalid credentials</p>
                    )}
                </Field>
                <Field>
                    <Button type="submit" disabled={isSubmitting} className="w-full">
                        {isSubmitting ? (<CircleNotch size={20} weight="bold" className="animate-spin"/>) : ("Login")}
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    )
}
