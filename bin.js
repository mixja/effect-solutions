#!/usr/bin/env bun

// Root-level bin entry for GitHub installations
// Delegates to the CLI package source directly

import { BunContext, BunRuntime } from "@effect/platform-bun"
import { Console, Effect, Layer, pipe } from "effect"
import pc from "picocolors"
import pkg from "./packages/cli/package.json" with { type: "json" }
import { EffectSolutionsService, GitService } from "./packages/cli/src/effect-solutions-service"
import { BrowserService, IssueService } from "./packages/cli/src/open-issue-service"
import { UpdateNotifier, UpdateNotifierConfig } from "./packages/cli/src/update-notifier"
import { runCli } from "./packages/cli/src/cli"

const CLI_NAME = "effect-solutions"
const CLI_VERSION = pkg.version

const MainLayer = UpdateNotifier.layer.pipe(
  Layer.provide(UpdateNotifierConfig.layer),
  Layer.merge(IssueService.layer.pipe(Layer.provide(BrowserService.layer))),
  Layer.merge(EffectSolutionsService.layer.pipe(Layer.provide(GitService.layer))),
  Layer.provideMerge(BunContext.layer),
)

pipe(
  Effect.gen(function* () {
    const notifier = yield* UpdateNotifier
    yield* notifier.check(CLI_NAME, CLI_VERSION)
    yield* runCli(process.argv)
  }),
  Effect.provide(MainLayer),
  Effect.tapErrorCause((cause) => Console.error(pc.red(`Error: ${cause}`))),
  Effect.catchAll(() => Effect.sync(() => process.exit(1))),
  BunRuntime.runMain,
)
