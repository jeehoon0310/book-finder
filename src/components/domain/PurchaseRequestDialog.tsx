'use client';

import { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface PurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle?: string;
}

export function PurchaseRequestDialog({ open, onOpenChange, defaultTitle = '' }: PurchaseRequestDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('purchase_requests')
      .insert({ title: title.trim(), message: message.trim() || null });

    setIsSubmitting(false);

    if (!error) {
      setIsSubmitted(true);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setIsSubmitted(false);
      setTitle(defaultTitle);
      setMessage('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">구매 요청</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            찾으시는 만화를 알려주시면 입고를 검토하겠습니다.
          </DialogDescription>
        </DialogHeader>

        {isSubmitted ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="font-semibold">요청이 접수되었습니다!</p>
            <p className="text-sm text-muted-foreground text-center">
              입고 검토 후 서가에 배치하겠습니다.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">만화 제목</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 원피스"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                추가 메시지 <span className="text-muted-foreground font-normal">(선택)</span>
              </label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="예: 1~10권 입고 부탁드립니다"
              />
            </div>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? '요청 중...' : '구매 요청하기'}
            </button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
