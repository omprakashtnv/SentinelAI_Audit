import { motion } from "framer-motion";

export function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          className="size-10 rounded-lg border border-border bg-primary"
          animate={{ rotate: 360, scale: [1, 0.92, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="text-sm text-muted-foreground">Loading SentinelAI</p>
      </div>
    </div>
  );
}

