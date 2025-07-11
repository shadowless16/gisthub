import { MainLayout } from "@/components/layout/main-layout"
import { Card, CardContent } from "@/components/ui/card"
import { Users } from "lucide-react"

export default function StudyGroupsPage() {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Study Groups</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Coming Soon</h3>
            <p className="text-muted-foreground">
              Study groups feature will be available soon. Connect with classmates and form study sessions!
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
