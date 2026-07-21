import { Composition } from "remotion";
import { NameTagsFilmV2 } from "./NameTagsFilmV2";

const FILM_SECONDS = 65;

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
    </>
  );
};
