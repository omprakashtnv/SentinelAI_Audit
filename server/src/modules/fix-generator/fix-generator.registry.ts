import type { SecurityKnowledgeBaseRule } from "../security-knowledge-base";
import { CATEGORY_FIX_RECIPES, RULE_FIX_RECIPES } from "./fix-generator.recipes";
import { KnowledgeBaseRuleFixGeneratorStrategy } from "./fix-generator.strategy";
import type { FixGeneratorRecipe, FixGeneratorStrategy } from "./fix-generator.types";

export function createFixGeneratorStrategies(rules: SecurityKnowledgeBaseRule[]): FixGeneratorStrategy[] {
  return rules.map((rule) => new KnowledgeBaseRuleFixGeneratorStrategy(rule, resolveFixGeneratorRecipe(rule)));
}

function resolveFixGeneratorRecipe(rule: SecurityKnowledgeBaseRule): FixGeneratorRecipe {
  const categoryRecipe = CATEGORY_FIX_RECIPES[rule.category];
  const ruleRecipe = RULE_FIX_RECIPES[rule.id];

  if (!ruleRecipe) {
    return categoryRecipe;
  }

  return {
    explanation: ruleRecipe.explanation ?? categoryRecipe.explanation,
    secureImplementation: ruleRecipe.secureImplementation || categoryRecipe.secureImplementation,
    remediationSteps: mergeOptionalLists(categoryRecipe.remediationSteps, ruleRecipe.remediationSteps),
    secureCodingRecommendations: mergeOptionalLists(
      categoryRecipe.secureCodingRecommendations,
      ruleRecipe.secureCodingRecommendations,
    ),
    codeExample: {
      ...categoryRecipe.codeExample,
      ...ruleRecipe.codeExample,
    },
  };
}

function mergeOptionalLists(left?: string[], right?: string[]): string[] | undefined {
  const merged = [...(left ?? []), ...(right ?? [])];

  if (merged.length === 0) {
    return undefined;
  }

  return [...new Set(merged)];
}
