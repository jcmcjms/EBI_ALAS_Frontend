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
import {apiClient, getErrorMessage} from "@/src/lib/apiClient";
import {extractUserFromToken} from "@/src/lib/jwt";
import {toast} from "sonner";

const loginSchema = z.object({
    username: z.string()
        .min(3, "Username is required")
        .max(50),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
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
    const onSubmit = async (data: LoginFormData) => {
        try {
            const response = await apiClient.post("/api/auth/login", data);
            const apiResponse = response.data;

            if (apiResponse.success && apiResponse.data?.accessToken) {
                const token = apiResponse.data.accessToken;
                const user = extractUserFromToken(token);

                if (user) {
                    setSession(token, user);
                    toast.success("Login successful");
                    navigate("/dashboard", { replace: true });
                } else {
                    toast.error("Failed to process login token");
                }
            } else {
                toast.error(apiResponse.message || "Login failed");
            }
        } catch (error) {
            toast.error(getErrorMessage(error));
        }
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
                    <FieldLabel htmlFor="username">Username</FieldLabel>
                    <Input
                    id="username"
                    placeholder="Username"
                    autoComplete="username"
                        {...register("username")}/>
                    {errors.username && (
                        <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>
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
                            aria-label={showPassword ? "Hide password" : "Show password"}
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
