'use client';

import { useRouter, useParams } from 'next/navigation';
import { useWorkspaces } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

export function WorkspaceSwitcher() {
  const router = useRouter();
  const params = useParams();
  const currentWorkspaceId = params.workspaceId as string | undefined;
  const { data: workspaces, isLoading } = useWorkspaces();

  const currentWorkspace = workspaces?.find((w) => w.id === currentWorkspaceId);

  if (isLoading) {
    return <Skeleton className="h-9 w-full" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="truncate">
            {currentWorkspace?.name || 'Select workspace'}
          </span>
          <svg
            className="ml-2 h-4 w-4 shrink-0 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l4-4 4 4m0 6l-4 4-4-4"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces?.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => router.push(`/workspaces/${workspace.id}`)}
            className="cursor-pointer"
          >
            <span className="truncate">{workspace.name}</span>
            {workspace.id === currentWorkspaceId && (
              <svg
                className="ml-auto h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </DropdownMenuItem>
        ))}
        {(!workspaces || workspaces.length === 0) && (
          <DropdownMenuItem disabled>No workspaces found</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
