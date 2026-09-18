import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/src/components/ui/sheet";
import { useAccountProfile, useUpdateProfile } from "@/src/hooks/useAccount";

// Mirrors EBI.ALAS.Api/Features/Account/AccountValidators.cs — keep in sync.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

const profileSchema = z.object({
    email: z
        .string()
        .trim()
        .max(100, "Email must not exceed 100 characters.")
        .refine((v) => v === "" || EMAIL_PATTERN.test(v), "Enter a valid email address."),
    phone: z
        .string()
        .trim()
        .max(20, "Phone must not exceed 20 characters.")
        .refine((v) => v === "" || PHONE_PATTERN.test(v), "Enter a valid phone number (digits, spaces, + - ( ))."),
    emergencyContact: z
        .string()
        .trim()
        .max(200, "Emergency contact must not exceed 200 characters."),
});

interface ProfileEditSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ProfileEditSheet({ open, onOpenChange }: ProfileEditSheetProps) {
    const { data: profile } = useAccountProfile();
    const updateProfile = useUpdateProfile();

    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [emergencyContact, setEmergencyContact] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Re-seed on every open so discarded edits never resurface.
    useEffect(() => {
        if (!open || !profile) return;
        setEmail(profile.email ?? "");
        setPhone(profile.phone ?? "");
        setEmergencyContact(profile.emergencyContact ?? "");
        setErrors({});
    }, [open, profile]);

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        const parsed = profileSchema.safeParse({ email, phone, emergencyContact });
        if (!parsed.success) {
            setErrors(
                Object.fromEntries(parsed.error.issues.map((issue) => [issue.path[0] as string, issue.message])),
            );
            return;
        }
        // Empty string → null so cleared fields actually clear server-side.
        updateProfile.mutate(
            {
                email: parsed.data.email || null,
                phone: parsed.data.phone || null,
                emergencyContact: parsed.data.emergencyContact || null,
            },
            { onSuccess: () => onOpenChange(false) },
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>Edit profile</SheetTitle>
                    <SheetDescription>
                        These details are used for contact tracing on loan actions. Leave a field empty to remove it.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto py-6" noValidate>
                    <div className="space-y-2">
                        <Label htmlFor="profile-email">Email</Label>
                        <Input
                            id="profile-email"
                            type="email"
                            autoComplete="email"
                            placeholder="name@enterprisebank.ph"
                            value={email}
                            aria-invalid={Boolean(errors.email)}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="profile-phone">Phone</Label>
                        <Input
                            id="profile-phone"
                            type="tel"
                            autoComplete="tel"
                            placeholder="+63 912 345 6789"
                            value={phone}
                            aria-invalid={Boolean(errors.phone)}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                        {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="profile-emergency">Emergency contact</Label>
                        <Input
                            id="profile-emergency"
                            placeholder="Name — +63 912 345 6789"
                            value={emergencyContact}
                            aria-invalid={Boolean(errors.emergencyContact)}
                            onChange={(e) => setEmergencyContact(e.target.value)}
                        />
                        {errors.emergencyContact && (
                            <p className="text-xs text-destructive">{errors.emergencyContact}</p>
                        )}
                    </div>

                    <SheetFooter className="mt-auto gap-2">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={updateProfile.isPending}>
                            {updateProfile.isPending ? "Saving…" : "Save changes"}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}
