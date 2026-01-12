'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { CLOSE_REASONS, CloseReason } from '@/types';

interface CloseTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketCount: number;
  onConfirm: (reason: CloseReason) => void;
  isProcessing?: boolean;
}

export function CloseTicketDialog({
  open,
  onOpenChange,
  ticketCount,
  onConfirm,
  isProcessing = false,
}: CloseTicketDialogProps) {
  const [selectedReason, setSelectedReason] = useState<CloseReason>('no_response');

  const handleConfirm = () => {
    onConfirm(selectedReason);
  };

  const ticketText = ticketCount === 1 ? 'ticket' : 'tickets';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Close {ticketCount} {ticketText}</DialogTitle>
          <DialogDescription>
            Select a reason for closing {ticketCount === 1 ? 'this ticket' : 'these tickets'}. Closed tickets are archived and won&apos;t appear in your active queue.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <RadioGroup
            value={selectedReason}
            onValueChange={(value) => setSelectedReason(value as CloseReason)}
            className="gap-3"
          >
            {CLOSE_REASONS.map((reason) => (
              <div key={reason.value} className="flex items-center space-x-3">
                <RadioGroupItem value={reason.value} id={reason.value} />
                <Label htmlFor={reason.value} className="font-normal cursor-pointer">
                  {reason.label}
                  {reason.value === 'duplicate' && (
                    <span className="text-muted-foreground text-xs ml-2">
                      (excluded from metrics)
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? 'Closing...' : `Close ${ticketText}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
