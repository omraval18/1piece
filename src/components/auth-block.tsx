"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const BRAND = "OnePiece"

const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

const signUpSchema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[0-9]/, "Include at least one number"),
    confirm: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })

export function AuthBlock({
  defaultTab = "signin",
}: {
  defaultTab?: "signin" | "signup"
}) {
  const router = useRouter()
  const [tab, setTab] = useState(defaultTab)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isSignUp = tab === "signup"

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<
      string,
      string
    >
    const result = (isSignUp ? signUpSchema : signInSchema).safeParse(data)
    if (!result.success) {
      const next: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0]
        if (typeof key === "string" && !next[key]) {
          next[key] = issue.message
        }
      }
      setErrors(next)
      return
    }
    setErrors({})

    const promise = (
      isSignUp
        ? authClient.signUp.email({
            name: data.name,
            email: data.email,
            password: data.password,
          })
        : authClient.signIn.email({
            email: data.email,
            password: data.password,
          })
    ).then((res) => {
      if (res.error) {
        throw new Error(res.error.message ?? "Something went wrong.")
      }
      return res
    })

    toast.promise(promise, {
      loading: isSignUp ? "Creating your account…" : "Signing you in…",
      success: () => {
        router.push("/")
        return isSignUp
          ? `Welcome to ${BRAND}! Your account is ready.`
          : `Welcome back to ${BRAND}.`
      },
      error: (err: Error) => err.message,
    })
  }

  function clearError(name: string) {
    setErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  return (
    <section className="flex w-full flex-1 items-center justify-center bg-muted/30 px-6 py-16 text-foreground">
      <Card className="w-full max-w-md gap-6">
        <CardHeader className="items-center gap-3 text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg font-bold tracking-tight">
              {isSignUp ? `Join ${BRAND}` : `Welcome back to ${BRAND}`}
            </CardTitle>
            <CardDescription>
              {isSignUp
                ? "Create your account in under a minute."
                : "Sign in to pick up where you left off."}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as "signin" | "signup")
              setErrors({})
            }}
          >
            <TabsList className="grid h-9 w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="pt-5">
              <form
                className="flex flex-col gap-5"
                onSubmit={handleSubmit}
                noValidate
              >
                <Field>
                  <FieldLabel htmlFor="signin-email">Email</FieldLabel>
                  <Input
                    id="signin-email"
                    name="email"
                    type="email"
                    placeholder="jordan@company.com"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    onChange={() => clearError("email")}
                  />
                  <FieldError>{errors.email}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="signin-password">Password</FieldLabel>
                  <Input
                    id="signin-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    aria-invalid={!!errors.password}
                    onChange={() => clearError("password")}
                  />
                  <FieldError>{errors.password}</FieldError>
                </Field>
                <Button type="submit" size="lg" className="w-full">
                  Sign in
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="pt-5">
              <form
                className="flex flex-col gap-5"
                onSubmit={handleSubmit}
                noValidate
              >
                <Field>
                  <FieldLabel htmlFor="signup-name">Full name</FieldLabel>
                  <Input
                    id="signup-name"
                    name="name"
                    type="text"
                    placeholder="Jordan Blake"
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    onChange={() => clearError("name")}
                  />
                  <FieldError>{errors.name}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-email">Email</FieldLabel>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="jordan@company.com"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    onChange={() => clearError("email")}
                  />
                  <FieldError>{errors.email}</FieldError>
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-password">Password</FieldLabel>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    onChange={() => clearError("password")}
                  />
                  {errors.password ? (
                    <FieldError>{errors.password}</FieldError>
                  ) : (
                    <FieldDescription>
                      Minimum 8 characters, at least one number.
                    </FieldDescription>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="signup-confirm">
                    Confirm password
                  </FieldLabel>
                  <Input
                    id="signup-confirm"
                    name="confirm"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirm}
                    onChange={() => clearError("confirm")}
                  />
                  <FieldError>{errors.confirm}</FieldError>
                </Field>
                <Button type="submit" size="lg" className="w-full">
                  Create account
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="justify-center text-xs text-muted-foreground">
          {isSignUp ? "Already have an account?" : `New to ${BRAND}?`}
          <Button
            variant="link"
            className="px-1 text-xs"
            type="button"
            onClick={() => setTab(isSignUp ? "signin" : "signup")}
          >
            {isSignUp ? "Sign in" : "Create one"}
          </Button>
        </CardFooter>
      </Card>
    </section>
  )
}
