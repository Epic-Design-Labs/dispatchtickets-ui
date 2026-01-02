'use client';

import { useState } from 'react';
import {
  useFeatureRequests,
  useFeatureActivity,
  useCreateFeatureRequest,
  useVoteFeatureRequest,
  useUnvoteFeatureRequest,
} from '@/lib/hooks';
import { FeatureRequest } from '@/lib/api/feature-requests';
import { Header } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronUp, Plus, Lightbulb } from 'lucide-react';

const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  under_review: 'bg-cyan-100 text-cyan-800',
  planned: 'bg-purple-100 text-purple-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  declined: 'bg-gray-100 text-gray-800',
};

const statusLabels: Record<string, string> = {
  new: 'New',
  under_review: 'Under Review',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  declined: 'Declined',
};

export default function FeatureRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('votes');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data: requestsData, isLoading, error } = useFeatureRequests({
    status: statusFilter === 'all' ? undefined : statusFilter,
    sortBy,
  });
  const { data: activityData, error: activityError } = useFeatureActivity();
  const createRequest = useCreateFeatureRequest();
  const voteRequest = useVoteFeatureRequest();
  const unvoteRequest = useUnvoteFeatureRequest();

  const requests = requestsData?.requests || [];
  const votedIds = new Set(activityData?.voted?.map((r) => r.id) || []);

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast.error('Please enter a title');
      return;
    }

    try {
      await createRequest.mutateAsync({
        title: newTitle.trim(),
        description: newDescription.trim() || undefined,
      });
      toast.success('Feature request submitted');
      setCreateDialogOpen(false);
      setNewTitle('');
      setNewDescription('');
    } catch {
      toast.error('Failed to submit feature request');
    }
  };

  const handleVote = async (request: FeatureRequest) => {
    const hasVoted = votedIds.has(request.id);

    try {
      if (hasVoted) {
        await unvoteRequest.mutateAsync(request.id);
        toast.success('Vote removed');
      } else {
        await voteRequest.mutateAsync(request.id);
        toast.success('Vote added');
      }
    } catch {
      toast.error('Failed to update vote');
    }
  };

  return (
    <div className="flex flex-col">
      <Header title="Feature Requests" />
      <div className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="votes">Most Votes</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="oldest">Oldest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Submit Request
          </Button>
        </div>

        {error || activityError ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h3 className="mt-4 text-lg font-medium text-destructive">Error loading feature requests</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {error?.message || activityError?.message || 'An unexpected error occurred'}
              </p>
              <Button className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <Skeleton className="h-16 w-16" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lightbulb className="h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No feature requests yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Be the first to suggest a feature!
              </p>
              <Button className="mt-4" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Submit Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const hasVoted = votedIds.has(request.id);
              return (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {/* Vote button */}
                      <button
                        onClick={() => handleVote(request)}
                        disabled={voteRequest.isPending || unvoteRequest.isPending}
                        className={`flex flex-col items-center justify-center rounded-lg border p-3 min-w-[60px] transition-colors ${
                          hasVoted
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-muted hover:border-primary hover:bg-primary/5'
                        }`}
                      >
                        <ChevronUp className="h-5 w-5" />
                        <span className="text-lg font-semibold">{request.voteCount}</span>
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium">{request.title}</h3>
                          <Badge className={statusColors[request.status] || statusColors.new}>
                            {statusLabels[request.status] || request.status}
                          </Badge>
                        </div>
                        {request.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {request.description}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Feature Request</DialogTitle>
            <DialogDescription>
              Suggest a new feature or improvement. Other users can vote on your request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Short, descriptive title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreate();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe your feature request in detail..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createRequest.isPending}>
              {createRequest.isPending ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
