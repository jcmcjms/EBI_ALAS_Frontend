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
import {useLogin} from "@/hooks/auth";
import {CircleNotch} from "@phosphor-icons/react";
import {getErrorMessage} from "@/lib/apiClient";

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
    const {register, handleSubmit, formState: {errors, isSubmitting}} = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
        mode: "onBlur"
    });
    const {mutate: login, isPending, error} = useLogin();
    const onSubmit = (data: LoginFormData) => {login(data);};
    return (
        <form onSubmit={handleSubmit(onSubmit)} className={cn("flex flex-col gap-6", className)} {...props}>
            <FieldGroup>
                <div className="flex flex-col items-center gap-1 text-center">
                    <h1 className="text-2xl font-bold">Login to your account</h1>
                    <p className="text-sm text-balance text-muted-foreground">
                        Enter your credentials below.
                    </p>
                </div>
                {error && (<div className="p-3 text-sm text-red-500 bg-red-50 rounded-md text-center">{getErrorMessage(error)}</div>)}
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
                    <Button type="submit" disabled={isPending || isSubmitting} className="w-full">
                        {isPending ? (<CircleNotch size={20} weight="bold" className="animate-spin"/>) : ("Login")}
                    </Button>
                </Field>
            </FieldGroup>
        </form>
    )
}