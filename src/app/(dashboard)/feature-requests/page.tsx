'use client';

import { useState } from 'react';
import {
  useFeatureRequests,
  useFeatureActivity,
  useCreateFeatureRequest,
  useVoteFeatureRequest,
  useUnvoteFeatureRequest,
} from '@/lib/hooks';
import { FeatureRequest, FeatureCategory } from '@/lib/api/feature-requests';
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
  const [newCurrentBehavior, setNewCurrentBehavior] = useState('');
  const [newFeatureDetails, setNewFeatureDetails] = useState('');
  const [newWhyItMatters, setNewWhyItMatters] = useState('');
  const [newCategory, setNewCategory] = useState<FeatureCategory | ''>('');

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
    if (!newFeatureDetails.trim()) {
      toast.error('Please enter feature details');
      return;
    }

    try {
      await createRequest.mutateAsync({
        title: newTitle.trim(),
        featureDetails: newFeatureDetails.trim(),
        currentBehavior: newCurrentBehavior.trim() || undefined,
        whyItMatters: newWhyItMatters.trim() || undefined,
        category: newCategory || undefined,
      });
      toast.success('Feature request submitted');
      setCreateDialogOpen(false);
      setNewTitle('');
      setNewCurrentBehavior('');
      setNewFeatureDetails('');
      setNewWhyItMatters('');
      setNewCategory('');
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
        <p className="mb-6 text-muted-foreground">
          Loving Dispatch Tickets and have ideas for improvements? Submit your idea here or vote for existing ideas from the community.
        </p>
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
                        {(request.featureDetails || request.description) && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {request.featureDetails || request.description}
                          </p>
                        )}
                        {request.category && (
                          <Badge variant="outline" className="mt-2 text-xs">
                            {request.category}
                          </Badge>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit Feature Request</DialogTitle>
            <DialogDescription>
              Suggest a new feature or improvement. Other users can vote on your request.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Brief summary of your request"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currentBehavior">
                Current Behavior <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="currentBehavior"
                placeholder="What currently happens that you'd like to change?"
                value={newCurrentBehavior}
                onChange={(e) => setNewCurrentBehavior(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="featureDetails">Feature Details</Label>
              <Textarea
                id="featureDetails"
                placeholder="Detailed description of the feature you'd like to see..."
                value={newFeatureDetails}
                onChange={(e) => setNewFeatureDetails(e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="whyItMatters">
                Why It Matters <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="whyItMatters"
                placeholder="Why is this feature important to you?"
                value={newWhyItMatters}
                onChange={(e) => setNewWhyItMatters(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="category">
                Category <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Select value={newCategory} onValueChange={(v) => setNewCategory(v as FeatureCategory)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="auth">Auth</SelectItem>
                  <SelectItem value="api">API</SelectItem>
                  <SelectItem value="dashboard">Dashboard</SelectItem>
                  <SelectItem value="analytics">Analytics</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
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
