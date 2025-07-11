import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle } from "lucide-react"

export default function MessagesPage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <MessageCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p className="text-muted-foreground">Start a conversation with your fellow students</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
