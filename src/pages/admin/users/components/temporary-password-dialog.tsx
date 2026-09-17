import { useEffect, useState } from "react";
import { Copy, Check, Eye, EyeSlash, ShieldWarning, WarningCircle } from "@phosphor-icons/react";
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Label } from "@/src/components/ui/label";

export interface TemporaryCredential {
    username: string;
    temporaryPassword: string;
}

/**
 * One-time credential handoff (GitHub/AWS pattern).
 *  - Masked by default — shared branch terminals defeat cleartext toasts.
 *  - Copy-to-clipboard + reveal toggle; the dialog is the ONLY place the
 *    secret renders, and only until dismissed.
 *  - Acknowledgment gates "Done" so the secret can't vanish uncopied.
 *  - Escape/overlay close blocked until acked or explicitly discarded.
 */
export function TemporaryPasswordDialog({
    credential,
    onDismiss,
}: {
    credential: TemporaryCredential | null;
    onDismiss: () => void;
}) {
    const [revealed, setRevealed] = useState(false);
    const [copied, setCopied] = useState(false);
    const [acked, setAcked] = useState(false);
    const [discarding, setDiscarding] = useState(false);

    useEffect(() => {
        if (credential) {
            setRevealed(false);
            setCopied(false);
            setAcked(false);
            setDiscarding(false);
        }
    }, [credential]);

    if (!credential) return null;

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(credential.temporaryPassword);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Clipboard blocked (permissions/iframe): fall back to reveal
            setRevealed(true);
        }
    };

    const requestClose = () => {
        if (acked) {
            onDismiss();
            return;
        }
        if (!discarding) {
            setDiscarding(true);
            return;
        }
        onDismiss();
    };

    return (
        <Dialog open onOpenChange={(o) => { if (!o) requestClose(); }}>
            <DialogContent
                className="sm:max-w-md"
                onInteractOutside={(e) => e.preventDefault()}
                onEscapeKeyDown={(e) => { e.preventDefault(); requestClose(); }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldWarning size={18} className="text-primary" weight="bold" />
                        Temporary password for @{credential.username}
                    </DialogTitle>
                    <DialogDescription>
                        Share this credential through a secure channel. It is shown
                        <strong> once</strong> and will not be recoverable afterwards.
                        The user must change it at first login.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <code
                            className="flex-1 rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm tracking-wide select-all"
                            aria-label="Temporary password"
                        >
                            {revealed
                                ? credential.temporaryPassword
                                : "\u2022".repeat(credential.temporaryPassword.length)}
                        </code>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setRevealed((v) => !v)}
                            aria-label={revealed ? "Hide password" : "Reveal password"}
                        >
                            {revealed ? <EyeSlash size={15} /> : <Eye size={15} />}
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={copy}
                            aria-label="Copy password to clipboard"
                        >
                            {copied ? (
                                <Check size={15} className="text-emerald-600" />
                            ) : (
                                <Copy size={15} />
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground" aria-live="polite">
                        {copied
                            ? "Copied to clipboard."
                            : "Masked by default \u2014 reveal only when the screen is private."}
                    </p>

                    {discarding && (
                        <p
                            role="alert"
                            className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs text-destructive"
                        >
                            <WarningCircle
                                size={14}
                                weight="fill"
                                className="mt-0.5 shrink-0"
                            />
                            Closing without copying means the password cannot be viewed
                            again. You would need to reset it once more. Close anyway?
                        </p>
                    )}

                    <div className="flex items-start gap-2">
                        <Checkbox
                            id="temp-pw-ack"
                            checked={acked}
                            onCheckedChange={(v) => setAcked(v === true)}
                        />
                        <Label
                            htmlFor="temp-pw-ack"
                            className="text-xs font-normal leading-4"
                        >
                            I have copied or securely recorded this password and shared it
                            with the user.
                        </Label>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={requestClose}>
                        {discarding ? "Confirm close" : "Close"}
                    </Button>
                    <Button size="sm" disabled={!acked} onClick={onDismiss}>
                        Done
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
