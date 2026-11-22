import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Gift, BookPlus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/Button";
import { TextField } from "@/components/Fields";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SuggestBookModal({ isOpen, onClose }: Props) {
  const [type, setType] = useState<"suggest" | "donate">("suggest");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitted(true);
  }

  function handleReset() {
    setTitle("");
    setAuthor("");
    setName("");
    setNotes("");
    setSubmitted(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-navy-900/75 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-paper-300 ring-1 ring-black/5"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-5 top-5 rounded-full p-2 text-ink-400 hover:bg-paper-200 hover:text-navy-900 transition-colors"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>

            {submitted ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-4"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-md">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h3 className="font-display text-2xl font-bold text-navy-900">
                  Daghang Salamat! (Thank You!)
                </h3>
                <p className="text-sm text-ink-600 max-w-sm mx-auto">
                  Your {type === "suggest" ? "book suggestion" : "donation interest"} for{" "}
                  <strong>"{title}"</strong> has been received by the Pangangan ES library staff!
                </p>
                <div className="pt-4">
                  <Button variant="primary" onClick={handleReset} className="w-full sm:w-auto">
                    Done
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div>
                <div className="mb-6">
                  <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3 py-1 text-xs font-bold text-gold-800">
                    <Heart className="h-3.5 w-3.5 fill-gold-600 text-gold-600" />
                    <span>Pangangan Literacy Community</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-navy-900">
                    Suggest or Donate a Book
                  </h2>
                  <p className="text-sm text-ink-600 mt-1">
                    Help us expand the storybook adventures for our pupils in Lomboy, Calape!
                  </p>
                </div>

                {/* Type Selector */}
                <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl bg-paper-200 p-1.5 border border-paper-300">
                  <button
                    type="button"
                    onClick={() => setType("suggest")}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                      type === "suggest"
                        ? "bg-white text-navy-900 shadow-sm"
                        : "text-ink-600 hover:text-navy-900"
                    }`}
                  >
                    <BookPlus className="h-4 w-4 text-sky-600" />
                    Suggest Title
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("donate")}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                      type === "donate"
                        ? "bg-white text-navy-900 shadow-sm"
                        : "text-ink-600 hover:text-navy-900"
                    }`}
                  >
                    <Gift className="h-4 w-4 text-gold-600" />
                    Donate Books
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <TextField
                    label="Book Title / Series"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Si Pagong at si Matsing, Charlotte's Web"
                    required
                    autoFocus
                  />

                  <TextField
                    label="Author (optional)"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g. Dr. Jose Rizal, E.B. White"
                  />

                  <TextField
                    label="Your Name or Section"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Parent, Alumni, Grade 4 - Rizal"
                    required
                  />

                  <div>
                    <label className="block text-xs font-semibold text-ink-800 mb-1">
                      Notes or Message (optional)
                    </label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Why should our students read this? Or details on how many copies you'd like to donate..."
                      className="w-full rounded-xl border border-paper-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
                    />
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end pt-2">
                    <Button onClick={onClose} variant="secondary">
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                      {type === "suggest" ? "Submit Suggestion" : "Submit Donation Info"}
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
