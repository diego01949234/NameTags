import { Composition } from "remotion";
import { NameTagsLiveDemo } from "./NameTagsLiveDemo";
import { NameTagsFilmV2 } from "./NameTagsFilmV2";

const FILM_SECONDS = 65;
const LIVE_DEMO_SECONDS = 90;

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="NameTagsFilm"
        component={NameTagsFilmV2}
        durationInFrames={FILM_SECONDS * 60}
        fps={60}
        width={3840}
        height={2160}
      />
      <Composition
        id="NameTagsFilmPreview"
        component={NameTagsFilmV2}
        durationInFrames={FILM_SECONDS * 24}
        fps={24}
        width={1920}
        height={1080}
      />
      <Composition
        id="NameTagsLiveDemo"
        component={NameTagsLiveDemo}
        durationInFrames={LIVE_DEMO_SECONDS * 60}
        fps={60}
        width={3840}
        height={2160}
      />
      <Composition
        id="NameTagsLiveDemoPreview"
        component={NameTagsLiveDemo}
        durationInFrames={LIVE_DEMO_SECONDS * 30}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
