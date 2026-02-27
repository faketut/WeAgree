"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Send, Loader2 } from "lucide-react";
import { publishAgreement } from "@/app/actions/agreements";

export function PublishDraftDialog({ agreementId }: { agreementId: string }) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handlePublish() {
        setLoading(true);
        setError(null);
        try {
            const result = await publishAgreement(agreementId, email || undefined);
            if (result.error) {
                setError(result.error);
            } else {
                setOpen(false);
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    title="Publish draft"
                >
                    <Send className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Publish & Auto-Sign</DialogTitle>
                    <DialogDescription>
                        Publishing will make the agreement active and apply your signature.
                        Optional: provide an email to invite the other party immediately.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    {error && (
                        <div className="text-sm font-medium text-destructive">{error}</div>
                    )}
                    <div className="grid gap-2">
                        <Label htmlFor="email">Invite by email (optional)</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="signer@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handlePublish} disabled={loading}>
                        {loading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        Publish now
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
