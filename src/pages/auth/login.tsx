import { LoginForm } from "@/src/pages/auth/login-form";

const ENTERPRISE_BANK_URL = "https://www.enterprisebank.ph/";

export default function Login() {
    return (
        <div className="grid min-h-svh lg:grid-cols-2">
            <div className="flex flex-col gap-4 p-6 md:p-10">
                <div className="flex justify-center gap-2 md:justify-start">
                    <a href={ENTERPRISE_BANK_URL}>
                        <img
                            src="/enterprise_bank-logo.png"
                            alt="Enterprise Bank Inc"
                            className="h-8 object-contain"
                        />
                    </a>
                </div>
                <div className="flex flex-1 items-center justify-center">
                    <div className="w-full max-w-xs space-y-8">
                        {/* System Branding */}
                        <div className="text-center">
                            <h1 className="text-3xl font-bold tracking-tight">ALAS</h1>
                            <p className="text-sm text-muted-foreground mt-1">Enterprise Bank Inc.</p>
                        </div>

                        <LoginForm/>
                    </div>
                </div>
            </div>
            <div className="relative hidden overflow-hidden lg:block">
                {/* Blurred, zoomed copy fills the letterbox so the panel reads full-bleed */}
                <img
                    src="/EBI_bg_login.png"
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl dark:brightness-[0.2] dark:grayscale"
                />
                {/* Crisp, uncropped artwork on top */}
                <img
                    src="/EBI_bg_login.png"
                    alt=""
                    className="absolute inset-0 h-full w-full object-contain dark:brightness-[0.2] dark:grayscale"
                />
            </div>
        </div>
    )
}