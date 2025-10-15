// store/api/registrationFormsApi.js
import { createApi } from "@reduxjs/toolkit/query/react";
import baseQuery from "./baseQuery";

export const registrationFormsApi = createApi({
  reducerPath: "registrationFormsApi",
  baseQuery,
  endpoints: (builder) => ({
    generateRegistrationData: builder.mutation({
      query: (body) => ({
        url: "/registration-forms",
        method: "POST",
        body, // { level, session, semester }
      }),
    }),
  }),
});

export const { useGenerateRegistrationDataMutation } = registrationFormsApi;
