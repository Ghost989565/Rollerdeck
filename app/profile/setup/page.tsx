"use client"

import { useState, useEffect, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Camera, Link2, Loader2, MapPin, Globe, Lightbulb, Target } from "lucide-react"

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_SIZE_MB = 2
const missingUsernameColumn = (message?: string) => (message || "").includes("username")

async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; country: string }> {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { "User-Agent": "RollerDeck/1.0 (contact@example.com)" } }
  )
  if (!res.ok) return { city: "", country: "" }
  const data = await res.json()
  const address = data.address || {}
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    ""
  const country = address.country || ""
  return { city, country }
}

async function forwardGeocode(city: string, country: string): Promise<{ lat: number; lng: number } | null> {
  const query = [city.trim(), country.trim()].filter(Boolean).join(", ")
  if (!query) return null
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    { headers: { "User-Agent": "RollerDeck/1.0 (contact@example.com)" } }
  )
  if (!res.ok) return null
  const data = (await res.json()) as Array<{ lat: string; lon: string }>
  if (!data.length) return null
  const first = data[0]
  const lat = Number(first.lat)
  const lng = Number(first.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

export default function ProfileSetupPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [bio, setBio] = useState("")
  const [bigIdeaTitle, setBigIdeaTitle] = useState("")
  const [bigIdeaDescription, setBigIdeaDescription] = useState("")
  const [bigIdeaGoals, setBigIdeaGoals] = useState("")
  const [valueProposition, setValueProposition] = useState("")
  const [tags, setTags] = useState("")
  const [linkedinUrl, setLinkedinUrl] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [photoMessage, setPhotoMessage] = useState<"ok" | "storage-missing" | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [photoPreview])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted || !user) {
          if (!user) router.replace("/auth/login")
          return
        }
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("name, username, initials, bio, big_idea_title, big_idea_description, big_idea_goals, value_proposition, tags, linkedin_url, avatar_url, city, country, lat, lng")
          .eq("id", user.id)
          .single()
        let finalProfile = profile
        if (profileError && missingUsernameColumn(profileError.message)) {
          const { data: fallbackProfile } = await supabase
            .from("profiles")
            .select("name, initials, bio, big_idea_title, big_idea_description, big_idea_goals, value_proposition, tags, linkedin_url, avatar_url, city, country, lat, lng")
            .eq("id", user.id)
            .single()
          finalProfile = fallbackProfile
        }
        if (mounted && finalProfile) {
          setName(finalProfile.name ?? "")
          setUsername("username" in finalProfile ? (finalProfile.username ?? "") : "")
          setBio(finalProfile.bio ?? "")
          setBigIdeaTitle(finalProfile.big_idea_title ?? "")
          setBigIdeaDescription(finalProfile.big_idea_description ?? "")
          setBigIdeaGoals(finalProfile.big_idea_goals ?? "")
          setValueProposition(finalProfile.value_proposition ?? "")
          setTags(finalProfile.tags ?? "")
          setLinkedinUrl(finalProfile.linkedin_url ?? "")
          setAvatarUrl(finalProfile.avatar_url ?? "")
          setCity(finalProfile.city ?? "")
          setCountry(finalProfile.country ?? "")
          setLat(finalProfile.lat != null && finalProfile.lat !== 0 ? finalProfile.lat : null)
          setLng(finalProfile.lng != null && finalProfile.lng !== 0 ? finalProfile.lng : null)
          if (finalProfile.avatar_url) setPhotoPreview(finalProfile.avatar_url)
        }
      } catch {
        if (mounted) setError("Could not load profile.")
      } finally {
        if (mounted) setLoadingProfile(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [router])

  async function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Your browser doesn’t support location.")
      return
    }
    setLocationError(null)
    setLocationLoading(true)
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        })
      })
      const latitude = position.coords.latitude
      const longitude = position.coords.longitude
      setLat(latitude)
      setLng(longitude)
      const { city: c, country: co } = await reverseGeocode(latitude, longitude)
      setCity(c)
      setCountry(co)
    } catch (err) {
      const code = err && typeof err === "object" && "code" in err ? (err as { code: number }).code : 0
      if (code === 1) {
        setLocationError("Location was denied. You can enter city and country below.")
      } else if (code === 2) {
        setLocationError("Location unavailable. Try again or enter manually.")
      } else if (code === 3) {
        setLocationError("Location request timed out. You can enter city and country below.")
      } else {
        setLocationError("Could not get location. You can enter city and country below.")
      }
    } finally {
      setLocationLoading(false)
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("")
    setPhotoFile((prev) => {
      if (prev) setPhotoPreview(avatarUrl || null)
      return null
    })
    const file = e.target.files?.[0]
    if (!file) {
      setPhotoPreview(avatarUrl || null)
      return
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, or WebP image.")
      setPhotoPreview(avatarUrl || null)
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB} MB.`)
      setPhotoPreview(avatarUrl || null)
      return
    }
    setPhotoFile(file)
    setPhotoPreview((prev) => {
      if (prev && prev.startsWith("blob:")) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")
    setPhotoMessage(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/auth/login")
        return
      }

      let finalAvatarUrl = avatarUrl
      let photoUploadFailed = false

      if (photoFile) {
        const ext = photoFile.name.split(".").pop() || "jpg"
        const path = `${user.id}/avatar.${ext}`
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, photoFile, { upsert: true })
        if (uploadError) {
          photoUploadFailed = true
          const isBucketError =
            uploadError.message?.toLowerCase().includes("bucket") ||
            uploadError.message?.toLowerCase().includes("not found")
          setPhotoMessage("storage-missing")
          if (!isBucketError) {
            setError(`Photo: ${uploadError.message}. Profile will still save.`)
          }
        } else {
          const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
          finalAvatarUrl = urlData.publicUrl
          setPhotoMessage("ok")
        }
      }

      const initials = name.trim()
        ? name.trim().split(/\s+/).map((s) => s[0]).join("").toUpperCase().slice(0, 2)
        : "U"
      const normalizedUsername = username.trim().replace(/^@+/, "").toLowerCase()
      if (normalizedUsername && !/^[a-z0-9_]{3,24}$/.test(normalizedUsername)) {
        setError("Username must be 3-24 characters and use only letters, numbers, or underscores.")
        setLoading(false)
        return
      }

      let resolvedLat = lat
      let resolvedLng = lng
      const needsGeocode =
        city.trim() &&
        country.trim() &&
        (resolvedLat == null || resolvedLng == null || (resolvedLat === 0 && resolvedLng === 0))
      if (needsGeocode) {
        const result = await forwardGeocode(city, country)
        if (result) {
          resolvedLat = result.lat
          resolvedLng = result.lng
          setLat(result.lat)
          setLng(result.lng)
        }
      }

      const payload = {
        id: user.id,
        name: name.trim() || "",
        username: normalizedUsername || "",
        initials: initials || "U",
        bio: bio.trim() || "",
        big_idea_title: bigIdeaTitle.trim() || "",
        big_idea_description: bigIdeaDescription.trim() || "",
        big_idea_goals: bigIdeaGoals.trim() || "",
        value_proposition: valueProposition.trim() || "",
        tags: tags.trim() || "",
        linkedin_url: linkedinUrl.trim() || "",
        avatar_url: finalAvatarUrl,
        city: city.trim() || "",
        country: country.trim() || "",
        lat: resolvedLat ?? 0,
        lng: resolvedLng ?? 0,
        updated_at: new Date().toISOString(),
      }

      let { error: updateError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" })

      if (updateError && missingUsernameColumn(updateError.message)) {
        // Database has not run username migration yet; save all other fields.
        const { username: _discard, ...payloadWithoutUsername } = payload
        const fallback = await supabase
          .from("profiles")
          .upsert(payloadWithoutUsername, { onConflict: "id" })
        updateError = fallback.error
      }

      if (updateError) {
        setError(updateError.message || "Could not save profile.")
        setLoading(false)
        return
      }

      if (photoUploadFailed) {
        setError(
          "Profile saved. To save profile photos, create a public bucket named \"avatars\" in Supabase Dashboard → Storage."
        )
      }

      router.push("/")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-foreground">Your profile</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This is what others see when they find you on the map.
          </p>
        </div>

        <div className="mb-6 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
          <Globe className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Name, photo, bio, location, and LinkedIn are shown on your map pin so connections can reach you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Photo upload */}
          <div className="flex flex-col items-center gap-3">
            <label className="text-sm font-medium text-foreground">Profile photo</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-secondary hover:border-primary/50 hover:bg-secondary/80 transition-colors cursor-pointer"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Camera className="h-10 w-10 text-muted-foreground" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handlePhotoChange}
              className="sr-only"
              aria-label="Upload profile photo"
            />
            <p className="text-xs text-muted-foreground">
              JPEG, PNG or WebP, max {MAX_SIZE_MB} MB
            </p>
            {photoMessage === "storage-missing" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 text-center max-w-[260px]">
                Photo storage isn’t set up. Create a public bucket named &quot;avatars&quot; in Supabase Storage to save photos.
              </p>
            )}
          </div>

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-medium text-foreground">
              Display name
            </label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="bg-card"
            />
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium text-foreground">
              Username
            </label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. maya_chen"
              className="bg-card"
            />
            <p className="text-xs text-muted-foreground">
              People can search this if your profile is private.
            </p>
          </div>

          {/* Bio */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bio" className="text-sm font-medium text-foreground">
              Bio
            </label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short intro others see on the map (e.g. what you do, what you’re looking for)"
              className="bg-card min-h-[88px] resize-y"
              rows={3}
            />
          </div>

          {/* Big Idea */}
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Big Idea</h3>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="big-idea-title" className="text-xs font-medium text-muted-foreground">
                Title
              </label>
              <Input
                id="big-idea-title"
                value={bigIdeaTitle}
                onChange={(e) => setBigIdeaTitle(e.target.value)}
                placeholder="e.g. The Future of Professional Communities"
                className="bg-card"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="big-idea-desc" className="text-xs font-medium text-muted-foreground">
                Description
              </label>
              <Textarea
                id="big-idea-desc"
                value={bigIdeaDescription}
                onChange={(e) => setBigIdeaDescription(e.target.value)}
                placeholder="Reimagining how professionals connect, learn, and grow together..."
                className="bg-card min-h-[72px] resize-y"
                rows={2}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="big-idea-goals" className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Target className="h-3.5 w-3.5" />
                Key initiatives
              </label>
              <Textarea
                id="big-idea-goals"
                value={bigIdeaGoals}
                onChange={(e) => setBigIdeaGoals(e.target.value)}
                placeholder="One per line:&#10;Launch 20 new cohorts&#10;Build community platform&#10;Write the community playbook"
                className="bg-card min-h-[80px] resize-y font-mono text-sm"
                rows={3}
              />
            </div>
          </div>

          {/* How they add value */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="value-prop" className="text-sm font-medium text-foreground">
              How you add value
            </label>
            <Textarea
              id="value-prop"
              value={valueProposition}
              onChange={(e) => setValueProposition(e.target.value)}
              placeholder="e.g. Master networker who can connect you to exactly the right person. Expertise in community-led growth."
              className="bg-card min-h-[72px] resize-y"
              rows={2}
            />
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tags" className="text-sm font-medium text-foreground">
              Tags
            </label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. community, education, creator (comma-separated)"
              className="bg-card"
            />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <MapPin className="h-4 w-4" />
              Your location
            </label>
            <p className="text-xs text-muted-foreground">
              Used to show resources and connections near you.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUseMyLocation}
              disabled={locationLoading}
              className="w-full"
            >
              {locationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Getting location…
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  Use my location
                </>
              )}
            </Button>
            {locationError && (
              <p className="text-xs text-destructive">{locationError}</p>
            )}
            {(city || country || lat != null) && (
              <p className="text-xs text-muted-foreground">
                {[city, country].filter(Boolean).join(", ") || ""}
                {lat != null && lng != null && ` (${lat.toFixed(4)}, ${lng.toFixed(4)})`}
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="city" className="text-xs font-medium text-muted-foreground">
                  City
                </label>
                <Input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value)
                    if (e.target.value.trim() && country.trim()) setLocationError(null)
                  }}
                  placeholder="City"
                  className="bg-card h-9"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="country" className="text-xs font-medium text-muted-foreground">
                  Country
                </label>
                <Input
                  id="country"
                  type="text"
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value)
                    if (city.trim() && e.target.value.trim()) setLocationError(null)
                  }}
                  placeholder="Country"
                  className="bg-card h-9"
                />
              </div>
            </div>
          </div>

          {/* LinkedIn */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="linkedin" className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Link2 className="h-4 w-4" />
              LinkedIn profile
            </label>
            <Input
              id="linkedin"
              type="url"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/in/yourprofile"
              className="bg-card"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save profile"
            )}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/" className="text-primary hover:underline">
            Skip for now
          </Link>
        </p>
      </div>
    </div>
  )
}
