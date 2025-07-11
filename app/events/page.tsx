import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "lucide-react"

export default function EventsPage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Calendar className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Events</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground">
              Campus events and activities will be displayed here. Stay tuned for updates!
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
