'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { feedbackApi } from '@/lib/api/feedback';
import { RatingFormData, CsatType } from '@/types';
import { ThumbsUp, ThumbsDown, Star, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandTile } from '@/components/brand-tile';

type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'error' | 'expired' | 'submitted';

export default function RatePage() {
  const params = useParams();
  const token = params.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [formData, setFormData] = useState<RatingFormData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Rating state
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);

  // Fetch feedback data on mount
  useEffect(() => {
    async function fetchFeedback() {
      try {
        const data = await feedbackApi.getByToken(token);
        setFormData(data);
        setPageState('ready');
      } catch (error: any) {
        const message = error?.response?.data?.message || 'Something went wrong';
        if (message.includes('already submitted')) {
          setPageState('submitted');
        } else if (message.includes('expired')) {
          setPageState('expired');
        } else if (message.includes('not found')) {
          setErrorMessage('This feedback request was not found.');
          setPageState('error');
        } else {
          setErrorMessage(message);
          setPageState('error');
        }
      }
    }
    fetchFeedback();
  }, [token]);

  const handleSubmit = async () => {
    if (selectedRating === null) return;

    setPageState('submitting');
    try {
      await feedbackApi.submit(token, {
        rating: selectedRating,
        comment: comment.trim() || undefined,
      });
      setPageState('success');
    } catch (error: any) {
      const message = error?.response?.data?.message || 'Failed to submit feedback';
      setErrorMessage(message);
      setPageState('error');
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="bg-canvas flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (pageState === 'success') {
    return (
      <div className="bg-canvas flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="bg-success-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <CheckCircle className="text-success-foreground h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Thank you for your feedback!</h2>
            <p className="text-muted-foreground">
              Your response has been recorded and helps us improve our service.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already submitted state
  if (pageState === 'submitted') {
    return (
      <div className="bg-canvas flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="bg-info-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <CheckCircle className="text-info h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Feedback already submitted</h2>
            <p className="text-muted-foreground">
              You have already submitted feedback for this ticket. Thank you!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expired state
  if (pageState === 'expired') {
    return (
      <div className="bg-canvas flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="bg-warning-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <Clock className="text-warning-foreground h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Link expired</h2>
            <p className="text-muted-foreground">
              This feedback request has expired. We appreciate your time anyway!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (pageState === 'error') {
    return (
      <div className="bg-canvas flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8">
            <div className="bg-danger-soft mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
              <AlertCircle className="text-danger h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ready state - show rating form
  return (
    <div className="bg-canvas flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          {/* The customer arrived here from an email wearing the brand's name
              and colours. Landing on an unbranded page reads as a different
              company asking, so the brand leads. All the API hands us is a
              name, which is enough for the tile to derive a colour from. */}
          {formData?.brand.name && (
            <div className="flex items-center gap-2">
              <BrandTile name={formData.brand.name} size="lg" />
              <span className="font-semibold">{formData.brand.name}</span>
            </div>
          )}
          <CardTitle className="text-xl">How was your experience?</CardTitle>
          <CardDescription className="font-mono text-xs">
            #{formData?.ticket.ticketNumber}
          </CardDescription>
          <p className="mt-1 text-sm font-medium">{formData?.ticket.title}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Rating UI based on type */}
          <div className="space-y-2">
            <Label className="text-center block">Your rating</Label>
            <RatingInput
              type={formData?.ratingType || 'thumbs'}
              value={selectedRating}
              onChange={setSelectedRating}
              hoveredValue={hoveredRating}
              onHover={setHoveredRating}
            />
          </div>

          {/* Optional comment */}
          <div className="space-y-2">
            <Label htmlFor="comment">Additional comments (optional)</Label>
            <Textarea
              id="comment"
              placeholder="Tell us more about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={1000}
            />
          </div>

          {/* Submit button */}
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={selectedRating === null || pageState === 'submitting'}
          >
            {pageState === 'submitting' ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Rating input component
function RatingInput({
  type,
  value,
  onChange,
  hoveredValue,
  onHover,
}: {
  type: CsatType;
  value: number | null;
  onChange: (value: number) => void;
  hoveredValue: number | null;
  onHover: (value: number | null) => void;
}) {
  if (type === 'thumbs') {
    return (
      <div
        className="flex justify-center gap-4"
        role="radiogroup"
        aria-label="Your rating"
      >
        <button
          type="button"
          role="radio"
          aria-checked={value === 1}
          onClick={() => onChange(1)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
            'hover:border-success focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            value === 1 ? 'border-success bg-success-soft' : 'border-border-strong'
          )}
        >
          <ThumbsUp
            className={cn('h-8 w-8', value === 1 ? 'text-success-foreground' : 'text-muted-foreground')}
          />
          <span
            className={cn(
              'text-sm font-medium',
              value === 1 ? 'text-success-foreground' : 'text-muted-foreground'
            )}
          >
            Good
          </span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === -1}
          onClick={() => onChange(-1)}
          className={cn(
            'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
            'hover:border-danger focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
            value === -1 ? 'border-danger bg-danger-soft' : 'border-border-strong'
          )}
        >
          <ThumbsDown
            className={cn('h-8 w-8', value === -1 ? 'text-danger' : 'text-muted-foreground')}
          />
          <span
            className={cn('text-sm font-medium', value === -1 ? 'text-danger' : 'text-muted-foreground')}
          >
            Bad
          </span>
        </button>
      </div>
    );
  }

  if (type === 'scale5') {
    return (
      <div className="flex justify-center gap-1" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = value !== null && n <= value;
          // The preview that follows the pointer has to follow the keyboard
          // too, or a keyboard user tabs through five identical empty stars
          // with no idea which one they are on.
          const isPreviewed = hoveredValue !== null && n <= hoveredValue;
          const showFilled = isSelected || isPreviewed;

          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
              onClick={() => onChange(n)}
              onMouseEnter={() => onHover(n)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(n)}
              onBlur={() => onHover(null)}
              className="focus-visible:ring-ring rounded-md p-1 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:outline-none"
            >
              <Star
                className={cn(
                  'h-10 w-10 transition-colors',
                  showFilled ? 'text-warning fill-warning' : 'text-muted-foreground'
                )}
              />
            </button>
          );
        })}
      </div>
    );
  }

  if (type === 'scale10') {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap justify-center gap-1" role="radiogroup" aria-label="Your rating">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} out of 10`}
              onClick={() => onChange(n)}
              className={cn(
                'h-10 w-10 rounded-lg border-2 font-medium transition-all',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                value === n
                  ? n <= 6
                    ? 'border-danger bg-danger-soft text-danger'
                    : n <= 8
                      ? 'border-warning bg-warning-soft text-warning-foreground'
                      : 'border-success bg-success-soft text-success-foreground'
                  : 'border-border-strong hover:border-muted-foreground/50'
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="text-muted-foreground flex justify-between px-1 text-xs">
          <span>Not likely</span>
          <span>Very likely</span>
        </div>
      </div>
    );
  }

  return null;
}
