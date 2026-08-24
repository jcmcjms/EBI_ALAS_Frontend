import * as React from "react";
import {cn} from "@/lib/utils"
import {
    Field,
    FieldGroup, FieldLabel
} from "@/components/ui/field"
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {z} from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {CircleNotch} from "@phosphor-icons/react";
import {useNavigate} from "react-router-dom";

const loginSchema = z.object({
    username: z.string()
        .min(3, "Username is required")
        .max(50)
        .regex(/^[a-zA-Z0-9_]+$/, "Invalid username format"),
    password: z.string()
        .min(8, "Invalid credentials")
        .max(100)
});

type LoginFormData = z.infer<typeof loginSchema>;

export  function LoginForm({className, ...props}: React.ComponentProps<"form">) {
    const navigate = useNavigate();
    const {register, handleSubmit, formState: {errors, isSubmitting}} = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: "onBlur"
    });
    const onSubmit = (data: LoginFormData) => {
        // Bypass login - redirect to dashboard
        navigate("/dashboard");
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
                    <Input
                    id="password"
                    type="password"
                    placeholder="Password"
                    autoComplete="current-password"
                        {...register("password")}/>
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