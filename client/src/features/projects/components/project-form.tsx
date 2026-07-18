import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/feedback/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { projectFormSchema, type ProjectFormValues } from "@/features/projects/project.schemas";

type ProjectFormProps = {
  defaultValues?: ProjectFormValues;
  errorMessage?: string;
  isSubmitting: boolean;
  showRepositoryUrl?: boolean;
  submitLabel: string;
  onSubmit: (values: ProjectFormValues) => void | Promise<void>;
};

export function ProjectForm({
  defaultValues,
  errorMessage,
  isSubmitting,
  showRepositoryUrl = true,
  submitLabel,
  onSubmit,
}: ProjectFormProps) {
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaultValues ?? {
      name: "",
      description: "",
      repositoryUrl: "",
    },
  });

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
      <FormError message={errorMessage} />

      <div className="space-y-2">
        <Label htmlFor="name">Project name</Label>
        <Input id="name" placeholder="SentinelAI web app" {...form.register("name")} />
        <FieldError message={form.formState.errors.name?.message} />
      </div>

      {showRepositoryUrl ? (
        <div className="space-y-2">
          <Label htmlFor="repositoryUrl">Repository URL</Label>
          <Input
            id="repositoryUrl"
            placeholder="https://github.com/acme/sentinelai"
            {...form.register("repositoryUrl")}
          />
          <FieldError message={form.formState.errors.repositoryUrl?.message} />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Short internal context for this project."
          {...form.register("description")}
        />
        <FieldError message={form.formState.errors.description?.message} />
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-xs text-destructive">{message}</p>;
}

